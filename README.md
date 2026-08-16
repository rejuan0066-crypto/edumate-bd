# Madrasa Companion

তুমি refine করে madrasah management website app built করে দাও

 

Create a fully dynamic and customizable Madrasa/School Management System with Frontend Website + Backend Admin Panel.

 

==================================================

TECH STACK

• Frontend: React

• Backend: Node.js / Express

• Database: MySQL



IMPORTANT:

• Fully dynamic system (no hardcoding)

• Admin controls everything without coding

• All validation, logic, and security must work properly

• Clean, modular, scalable architecture

 

==================================================

LOGIN SYSTEM (PASSWORD + MOBILE OTP 2FA)

 

Users:

• Admin

• Staff

• Teacher

 

Login Flow:

1. Enter Username/Email + Password

2. If correct → send OTP to registered mobile number

3. User enters OTP

4. If correct → login success

 

OTP Rules:

• 4–6 digit OTP

• Expiry: 2–5 minutes

• Max attempts: 3–5

• Resend option with cooldown

 

Security:

• OTP must be verified in backend

• Cannot bypass OTP

• Block user after multiple failed attempts

 

==================================================

ROLE & PERMISSION SYSTEM

 

Roles:

• Admin

• Staffs (admin given permission can do)

• Teachers (admin given permission can do)

 

Admin:

• Full control

 

Admin can assign permissions:

• Menu access (show/hide)

• Action control (view/add/edit/delete/approve)

 

Menus:

Madrasa Dashboard

    

-Madrasah logo,Name,Address,Phone,Email,others info(Add,edit,update save)

 this All fielded show on Student+Teacher+Staff form,Student+Teacher+Staff Profile, Result Sheet, Student Marksheet.

  Show Statistics:

-Search box (Search Result View info ,Admin can action >delete/edit/update/active/inactive )

-Staffs and amounts

-Teachers and amounts

-Total Students (Yearly/Session) and amounts

- non orphan&poor and amounts

-orphan and amounts

-poor and amounts

-new Students and amounts

-Old Students and amounts

-Resident Students and amounts

-Non-Resident Studentsand amounts (All Show Statistics can View list and profile)

-Active Students and amounts

-Inactive Students  and amounts

-Fees Monthy

>show months name with year and total amounts taka >click

> show paid students list and student amounts (only who paid )

name-roll-class-month-year-paid amount

> show unpaid students list and student amounts (only who unpaid )

name-roll-class-month-year - status unpaid

(both list are class and roll seriel wise creatre and printable)

 

-Fees Exam

>show exam name with session year and total amounts taka >click

> show paid students list and student amounts (only who paid )

name-roll-class-exam session-session year-paid amount

> show unpaid students list and student amounts (only who unpaid )

name-roll-class-exam session-session year - status unpaid

(both list are class and roll seriel wise creatre and printable)

 

-Fees Admision

>show admission session year and total amounts taka >click

> show paid students list and student amounts (only who paid )

name-roll-class- admission session year-paid amount

> show unpaid students list and student amounts (only who unpaid )

name-roll-class-admission session year - status unpaid

(both list are class and roll seriel wise creatre and printable)

 

              All fee will be save month wise

    

• Student Active/inactive option

• Admission History

• Edit / Update option

• Student

• Staff

• Result

• Notice

• Fees

• Division/Class

• Subject

• Website control



• Students Full profile view

• Image upload/update

• Edit/Delete

• Admission history

• Session history



IMPORTANT:

• Permission must be enforced in backend (secure)

 

==================================================

ADMIN PANEL

• Dashboard

• Donner list

• Student Management 

• Staff/Teacher Management 

• Division & Class 

• Subject

• Result

• Notice (Approval)

• Fees

• Website Control

• Staff/Teacher regine letter

• Staff/Teacher joinig letter

       • Designation (create )

• admin can add any type-field/pickup-field/check box/raido button/dropdown-field/ and any customization without coding&logic

• setting

                                Show Statistics:

Student admin form

Staff/Teacher Add/Application form

fee ricept

resign letter

Joining letter

Admision letter

Move to menu bar

Create new form/letter/recipt/menu/menu bar and others

 

*admin edit/customize/updete without coding and logic

 

 

==================================================

STUDENT MANAGEMENT (FULL SYSTEM)

1. Dynamic Admission Form Builder:

 

• Admin can add/edit/delete fields anytime

• Field types:

• Text, Number, Date

• Dropdown, Radio

• File upload (student image)

 

 

Admission Form

  

1.  Student Details :

• Photo Upload (Print form Right Corner)

 • Addmission session (dropdown box or Type)

                • Roll (auto and editable )

                • Regi:No (auto and  editable )

• Admission Date (pickup or type)

• Session Year  (pickup or type)

• Student Fast Name

• Student Last Name

• male/female (dropdown)

• relgious

• Student Last Name

• non orphan&poor (check box)

• orphan (check box)

• poor (check box)

• Birth of Date   (pickup or type) after date of birth pickup/type show >y-m-d.

• Birth Registration Number (Must be 17digit)

 

Validation:

• If Birth Reg No exists → show popup (Roll, Reg No, Admission Session)

 

Options:

• Resident / Non-resident

• New / Old student

 

Old Student Logic:

• Show fields:

• Roll, admission session, Class

• Search button → auto fetch & autofill

 

⸻ • Permanent Address

Create a complete 4-level dependent dropdown system

The hierarchy must be: Division -> District -> Upazila -> Union (Bangladesh context).

 

•  Post Office  (field type)

• Village (field type)

 

• Present Address (Same as Permanent check box selected → auto fill) or

 

Create a complete 4-level dependent dropdown system

The hierarchy must be: Division -> District -> Upazila -> Union (Bangladesh context).

 

•  Post Office  (field type)

• Village (field type)

 

 

2. Parents Information:

 

• Father Name, Occupation, NID(NID must be 10 or 17 digits)

•              mobile number field country wise

• Mother Name, Occupation, NID(NID must be 10 or 17 digits

                •              mobile number field country wise

• Permanent Address

• Present Address (Same as Permanent check box selected → auto fill) or both address same as student Address check box.

 

Validation:

• At least one NID( must be 10 or 17 digits)

 

⸻ • At least one mobile number required

 

3. Guardian Information:

Select:

 

• Father / Mother / Others

 

IF Father/Mother:

→ Auto fill data

→ Hide address field

 

IF Others:

• Full Name

• Relation

•              mobile number field country wise

• NID (10/17 digits required

• Permanent Address

• Present Address (Same as Permanent check box selected → auto fill)

 

⸻*note   

l student admission form fillup submit any person backend and fontend after Submit>show massaege> submited>  or not sumited succes show resion masseage)

l Only admin can aproved

 

 

4. Student Profile System:

 

• Full profile view

• Image upload/update

• Edit/Delete

• Admission history

• Session history

 

6. Student Promotion System:

 

• Promote to next class

• Maintain history

• Auto update session

 

⸻

 

7. Smart Search:

 

• Search by Name / Roll / Reg No

• Auto suggestion

• Fast filtering

 

==================================================

STAFF / EMPLOYEE MANAGEMENT (FULL)



Staff/teacher form

1. Employee Details:

 

• Photo upload/update

• First Name

   • Last Name

•              mobile number field country wise

• Designation (dropdown )

• Residential/ Non-residential

• Date of Birth (pickup/type )

• relgious

 

Identity:

• NID (10/17 digits) OR Birth Reg (17 digits)

• Education Qualification

• Experience

 

Logic:

• If Experience filled → Previous Job Institute REQUIRED

 

• Permanent Address

Create a complete 4-level dependent dropdown system

The hierarchy must be: Division -> District -> Upazila -> Union (Bangladesh context).

 

•  Post Office  (field type)

• Village (field type)

 

• Present Address (Same as Permanent check box selected → auto fill) or

 

Create a complete 4-level dependent dropdown system

The hierarchy must be: Division -> District -> Upazila -> Union (Bangladesh context).

 

•  Post Office  (field type)

• Village (field type)

 

 

2. Parents Details:

 

• Father Name

•              mobile number field country wise

• Father NID

• Father Occupation

• Mother Name

•              mobile number field country wise

• Mother NID

• Mother Occupation

• Permanent Address

• Present Address (Same as Permanent check box selected → auto fill)

 

Validation:

• At least one NID required (10/17 digits)

 

⸻ • At least one mobile number required

 

3. Guardian Details:

Select:

 

• Father / Mother / Others

 

IF Father/Mother:

→ Auto fill guardian info

 

IF Others:

• Full Name

•              mobile number field country wise

• Relation

• NID (10/17 digits)

• Full Address

 

⸻

 

4. Identifier Details

• Full Name

•              mobile number field country wise

• Relation

• NID (10/17 digits)

• Occupation

• Full Address



 

==================================================

DIVISION & CLASS SYSTEM

• Add Division

• Add Class under Division

• Dynamic linking with frontend

 

==================================================

SUBJECT SYSTEM

• Add/Edit/Delete subject

• Assign subjects to class

 

==================================================

RESULT MANAGEMENT SYSTEM

 

Search:

• Exam Year

• Exam Session Name

• Student Session

• Class

Create Exam session

• Exam Session Name

• Exam Year

• Class

• Student Session

 

Result Input:

• Students = columns

• Subjects = rows

 

Features:

• Add missing student

• Add missing subject

 

Auto Calculation:

• Total

• Grade

• GPA

 

View:

• Individual student result

• Class-wise result

 

Print:

• Individual result print

• Class result print

 

==================================================

NOTICE SYSTEM (ADMIN APPROVAL)

• All frontend/ staff,teacher backend submissions go to admin approval

 

Status:

• Pending

• Pending edit/updte

• Approved

• Approved list to pending

• Rejected 

• Rejected list to pending

 

Flow:



• Admin approve → Show on frontend

 

==================================================

FEES  SYSTEM

• Track student fees

• Paid / Unpaid

admission fee

Admission session(dropdown select)

Class(after select admission session visable class)

Roll (after select class visable roll)

Full name (after select roll visable full name)

Paid amount type(who student will paid payment stastus unpaid  to paid)

Paid date auto and pickup

(save to student profile)

 

Monthy fee

Admission session(dropdown select)

Class(after select admission session visable class)

Roll (after select class visable roll)

Full name (after select roll visable full name)

For month(dropdown-month-year or tyype)

Paid amount type (who student will paid payment stastus unpaid to paid)

Paid date auto and pickup

(save to student profile)

 

 

Exam fee

Admission session(dropdown select)

Class(after select admission session visable class)

Roll (after select class visable roll)

Full name (after select roll visable full name)

Exam session(dropdown)

Paid amountPaid amount type (who student will paid payment stastus unpaid to paid)

Paid date auto and pickup

(save to student profile)

 

• Reports

 

==================================================

FRONTEND WEBSITE

 

MENU:

• Home

• About (Bangla)

• Gallery

• Student Admission

• Result Find

• Student Admission Info

• Notice Board

• Contact

 

⸻

 

HOME PAGE:

• Banner

• Principal Message

 

Sidebar:

• Class Info (show)

• Teachers list (hide)

• Student Info (hide)

 

Notice:

• Latest + all

 

Online Admission Buttons:

• Hifz Division

• Nurani Division

• Ebtedayee Division

• Mutawassitah Division

 

Dynamic Logic:

• Divisions auto load from backend

• Click division → show classes → open admission form

 

⸻

 

PAGES:

 

About:

• Editable Bangla content

 

Gallery:

• Upload / Edit / Delete

 

Admission:

• Same backend dynamic form

 

Result:

• Search by Year + Class + Roll

• View + Print

 

Student Info:

• Filter + profile view

Donation

•online  and menual donation  bd mobile bank/card/bank (admin can hide this option)

Fee Pyment

•online  and menual  Admission fee/Monthy fee/Exam fee  bd mobile bank/card/bank (admin can hide this option)

               

Notice:

• Only approved notices visible

 

==================================================

LANGUAGE SYSTEM

• Bangla + English

• Toggle switch

 

==================================================

ADMIN CONTROL (FRONTEND + BACKEND)

• Full website control

• Form builder control

• Section show/hide

• Content editing

• Notice control

• Menu control

 

 

==================================================

FINAL REQUIREMENTS

• Fully working system (no demo limitation)

• Secure backend (validation + permission + OTP)

• Scalable & modular structure

• Clean UI/UX (modern dashboard)

• Mobile responsive

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://subhaniabd.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8564078b-79b9-40ef-8f5b-8322e217d011).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
