# Attendance Management System - Mahaweli Authority (Sinhapura Branch)

## Project Overview
Ha ek client-side web application aahe jo Sinhapura branch chya karmacharyanchi (employees) attendance, check-in/check-out vel, aani overtime (OT) track karel. Data browser chya local storage madhye save hoil.

---

## 1. Business Requirements

### 1.1. Core Objectives
* Sinhapura Branch chya staff sathi daily attendance manage karnyasathi ek sadhi aani soppi system banavne.
* Server chi garaj n lagta, browser madhyech data store karne.

### 1.2. Key Features & Functionalities
* **Member Management (Pre-added & New):**
    * System chalu hotanach 'Branch Manager' aani 'W Saman Chandramal' he don members default add asle pahijet.
    * Nantar navin members (Name, Designation, Member ID) add karnyachi suvidha asel.
* **Individual Attendance Tracking:**
    * Pratyek member sathi individual "In Time" aani "Out Time" record karne.
    * Attendance mark kartana member aani tarikh (date) select karnyachi suvidha.
* **Individual Overtime (OT) Calculation:**
    * Standard working hours (udaharanarth: 8 taas) nishchit karne.
    * Pratyek member cha individual kamacha vel calculate karun tyanche extra taas Overtime (OT) mhanun dakhavne.
* **Individual Reporting & Viewing:**
    * Pratyek member cha swatantra attendance aani OT report baghnyachi suvidha (Individual Dashboard).
    * Navanusar (by name) kiva tarkenusar (by date) individual attendance filter aani search karnyachi suvidha.

---

## 2. Technical Requirements

### 2.1. Technology Stack
* **Structure:** HTML5
* **Styling:** Tailwind CSS (CDN cha wapar karun).
* **Logic:** Vanilla JavaScript (ES6+).
* **Database:** Dexie.js (IndexedDB cha wapar karun data locally store karnyasathi).

### 2.2. Database Schema (Dexie.js)
Database che nav `MahaweliAttendanceDB` asel aani tyat don tables astil:

1. **`members` table:**
    * `id`: Primary Key (Auto-incremented)
    * `memberId`: String (Unique ID)
    * `name`: String
    * `designation`: String
    * *Initial Data Requirement:* Database pahaileda create hotana Dexie.js chya `on('populate')` method cha wapar karun 'Branch Manager' aani 'W Saman Chandramal' ya don entries automatically insert karnya yetil.

2. **`attendance` table:**
    * `id`: Primary Key (Auto-incremented)
    * `memberId`: Foreign Key (members table shi link kelela)
    * `date`: Date string (YYYY-MM-DD)
    * `inTime`: Time string (HH:MM)
    * `outTime`: Time string (HH:MM)
    * `overTime`: Number (Calculated individual OT in hours/minutes)

### 2.3. User Interface (UI) Requirements
* **Dashboard:** Pratyek member cha individual data aani OT dakhavnyasathi special views.
* **Forms:** Attendance aani navin members add karnyasathi validation sobat forms.
* **Responsiveness:** Tailwind CSS cha wapar karun mobile aani desktop donhi sathi optimized UI.