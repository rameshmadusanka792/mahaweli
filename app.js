// Initialize Dexie Database
const db = new Dexie('MahaweliAttendanceDB');

db.version(1).stores({
    members: '++id, &memberId, name, designation',
    attendance: '++id, memberId, date, inTime, outTime, overTime, [memberId+date]'
});

// Seed default members if db is new
db.on('populate', async () => {
    await db.members.bulkAdd([
        { memberId: 'MGR-001', name: 'Branch Manager', designation: 'Manager' },
        { memberId: 'EMP-002', name: 'W Saman Chandramal', designation: 'Staff Officer' }
    ]);
});

// App State
const state = {
    STANDARD_WORK_HOURS: 8,
    members: []
};

// Update Time continuously
setInterval(() => {
    document.getElementById('current-time').innerText = new Date().toLocaleString();
}, 1000);

// Initialize application
window.onload = async () => {
    await db.open();
    await loadInitialData();
    switchTab('dashboard'); // default tab
};

// UI: Tab Switching Logic
function switchTab(tabId) {
    // hide all tabs
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    // de-activate all nav items
    document.querySelectorAll('nav button').forEach(el => el.classList.remove('nav-active', 'bg-slate-50'));

    // activate selected tab and nav
    document.getElementById(`tab-${tabId}`).classList.add('active');

    const activeNav = document.getElementById(`nav-${tabId}`);
    if (activeNav) {
        activeNav.classList.add('nav-active');
        activeNav.classList.remove('hover:bg-slate-50');
    }

    // Refresh specific tab data
    if (tabId === 'dashboard') loadDashboardData();
    if (tabId === 'members') loadMembersList();
}

// Data loading
async function loadInitialData() {
    state.members = await db.members.toArray();
    populateMemberSelects();
    // Default today in attendance tab
    document.getElementById('att-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('filter-date').value = new Date().toISOString().split('T')[0];
}

function populateMemberSelects() {
    const filters = document.getElementById('filter-member');
    const attMember = document.getElementById('att-member');
    const otMember = document.getElementById('ot-member');

    let optionsHtml = '<option value="">All Members</option>';
    let plainHtml = '<option value="" disabled selected>Select a Member</option>';

    state.members.forEach(m => {
        optionsHtml += `<option value="${m.memberId}">${m.name} (${m.memberId})</option>`;
        plainHtml += `<option value="${m.memberId}">${m.name} (${m.memberId})</option>`;
    });

    if (filters) filters.innerHTML = optionsHtml;
    if (attMember) attMember.innerHTML = plainHtml;
    if (otMember) otMember.innerHTML = plainHtml;
}

// Calculate Overtime
function calculateDuration(inTime, outTime) {
    if (!outTime) return { hrs: 0, ot: 0 };

    const start = new Date(`1970-01-01T${inTime}`);
    const end = new Date(`1970-01-01T${outTime}`);

    if (end < start) end.setDate(end.getDate() + 1); // handles overnight shifts if any

    const diffMs = end - start;
    const diffHrs = diffMs / (1000 * 60 * 60); // Total hours worked

    const otHrs = diffHrs > state.STANDARD_WORK_HOURS ? (diffHrs - state.STANDARD_WORK_HOURS) : 0;

    return {
        hrs: parseFloat(diffHrs.toFixed(2)),
        ot: parseFloat(otHrs.toFixed(2))
    };
}

// Handle Form Submissions : Member
document.getElementById('member-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const memberId = document.getElementById('mem-id').value.trim();
    const name = document.getElementById('mem-name').value.trim();
    const designation = document.getElementById('mem-designation').value.trim();

    try {
        await db.members.add({ memberId, name, designation });
        alert('Member successfully registered!');
        e.target.reset();
        await loadInitialData();
        loadMembersList();
    } catch (err) {
        alert('Error adding member. ID might already exist.');
        console.error(err);
    }
});

// Handle Form Submissions : Attendance
document.getElementById('attendance-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('att-id').value;
    const date = document.getElementById('att-date').value;
    const memberId = document.getElementById('att-member').value;
    const inTime = document.getElementById('att-in').value;
    const outTime = document.getElementById('att-out').value;

    const calc = calculateDuration(inTime, outTime);

    const record = { date, memberId, inTime, outTime, overTime: calc.ot };

    try {
        if (id) {
            await db.attendance.update(parseInt(id), record);
        } else {
            // check if already marked for the day
            const existing = await db.attendance.where({ memberId, date }).first();
            if (existing) {
                if (confirm('Attendance already exists for this date. Update out time?')) {
                    await db.attendance.update(existing.id, { outTime, overTime: calc.ot });
                } else {
                    return;
                }
            } else {
                await db.attendance.add(record);
            }
        }
        alert('Attendance saved successfully!');
        e.target.reset();
        document.getElementById('att-id').value = '';
        document.getElementById('att-date').value = new Date().toISOString().split('T')[0];
    } catch (err) {
        alert('Failed to save attendance.');
        console.error(err);
    }
});

// Tab specific loading logic
async function loadMembersList() {
    const list = document.getElementById('members-list');
    list.innerHTML = '';

    state.members.forEach(m => {
        list.innerHTML += `
            <div class="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center group">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold">
                        ${m.name.charAt(0)}
                    </div>
                    <div>
                        <p class="font-bold text-sm text-slate-800">${m.name}</p>
                        <p class="text-xs text-slate-500">${m.designation} &bull; ${m.memberId}</p>
                    </div>
                <button onclick="deleteMember(${m.id})" class="text-slate-300 hover:text-red-500 transition-colors p-2" title="Remove Member">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
    });
}

// Dashboard filters
let filterState = { member: '', date: new Date().toISOString().split('T')[0] };

function clearFilter() {
    document.getElementById('filter-member').value = '';
    document.getElementById('filter-date').value = '';
    loadDashboardData();
}

async function loadDashboardData() {
    // Populate stats
    document.getElementById('stat-members').innerText = state.members.length;

    const today = new Date().toISOString().split('T')[0];
    const todaysAtt = await db.attendance.where('date').equals(today).toArray();
    document.getElementById('stat-attendance').innerText = todaysAtt.length;

    const allAtt = await db.attendance.toArray();
    const totalOT = allAtt.reduce((sum, r) => sum + (r.overTime || 0), 0);
    document.getElementById('stat-ot').innerText = totalOT.toFixed(1);

    await loadRecords();
}

async function loadRecords() {
    const fMember = document.getElementById('filter-member').value;
    const fDate = document.getElementById('filter-date').value;

    let query = db.attendance;
    let records = [];

    if (fMember && fDate) {
        records = await query.where({ memberId: fMember, date: fDate }).toArray();
    } else if (fMember) {
        records = await query.where('memberId').equals(fMember).toArray();
    } else if (fDate) {
        records = await query.where('date').equals(fDate).toArray();
    } else {
        records = await query.toArray();
    }

    const tbody = document.getElementById('records-table-body');
    tbody.innerHTML = '';

    // Sort by date DESC
    records.sort((a, b) => new Date(b.date) - new Date(a.date));

    records.forEach(r => {
        const member = state.members.find(m => m.memberId === r.memberId) || { name: 'Unknown' };

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 transition">
                <td class="p-4 font-medium text-slate-700">${r.date}</td>
                <td class="p-4"><span class="font-bold text-slate-800">${member.name}</span><br><span class="text-xs text-slate-500">${r.memberId}</span></td>
                <td class="p-4">
                    <span class="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 text-xs font-bold rounded">
                        <i class="fa-solid fa-arrow-right-to-bracket mr-1"></i> ${r.inTime}
                    </span>
                </td>
                <td class="p-4">
                    ${r.outTime ? `<span class="inline-flex items-center px-2 py-1 bg-orange-50 text-orange-700 text-xs font-bold rounded">
                        <i class="fa-solid fa-arrow-right-from-bracket mr-1"></i> ${r.outTime}
                    </span>` : '<span class="text-xs text-slate-400">Not Marked</span>'}
                </td>
                <td class="p-4 font-bold ${r.overTime > 0 ? 'text-orange-600' : 'text-slate-500'}">${r.overTime || '-'}</td>
                <td class="p-4 text-center">
                    <button onclick="editRecord(${r.id})" class="text-blue-500 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 text-xs font-bold transition">
                        Edit
                    </button>
                    <button onclick="deleteRecord(${r.id})" class="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 text-xs font-bold transition ml-1">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    });
}

// Edit & Delete Handlers
window.editRecord = async function (id) {
    const r = await db.attendance.get(id);
    if (!r) return;

    switchTab('attendance');

    document.getElementById('att-id').value = r.id;
    document.getElementById('att-date').value = r.date;
    document.getElementById('att-member').value = r.memberId;
    document.getElementById('att-in').value = r.inTime;
    document.getElementById('att-out').value = r.outTime || '';

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.deleteRecord = async function (id) {
    if (confirm('Are you sure you want to delete this attendance record?')) {
        await db.attendance.delete(id);
        loadDashboardData();
    }
}

window.deleteMember = async function (id) {
    if (confirm('Are you sure you want to remove this member?')) {
        try {
            await db.members.delete(id);
            await loadInitialData();
            loadMembersList();
            loadDashboardData();
        } catch (err) {
            alert('Failed to remove member.');
            console.error(err);
        }
    }
}

// Handle Form Submissions : OT Calculator
document.getElementById('ot-calc-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const memberId = document.getElementById('ot-member').value;
    const rate = parseFloat(document.getElementById('ot-rate').value);
    const startDate = document.getElementById('ot-start-date').value;
    const endDate = document.getElementById('ot-end-date').value;

    if (!memberId || isNaN(rate) || !startDate || !endDate) {
        alert("Please fill all required fields correctly.");
        return;
    }

    if (startDate > endDate) {
        alert("Start date cannot be after end date.");
        return;
    }

    try {
        const records = await db.attendance
            .where('memberId').equals(memberId)
            .toArray();

        const filtered = records.filter(r => r.date >= startDate && r.date <= endDate);

        let totalOTHours = 0;
        filtered.forEach(r => {
            totalOTHours += (r.overTime || 0);
        });

        const totalPayout = totalOTHours * rate;

        document.getElementById('ot-res-hours').innerText = totalOTHours.toFixed(2);

        // Add thousand separators for neat view
        document.getElementById('ot-res-amount').innerText = "Rs. " + totalPayout.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        document.getElementById('ot-result-section').classList.remove('hidden');

    } catch (err) {
        console.error(err);
        alert("An error occurred while computing OT.");
    }
});
