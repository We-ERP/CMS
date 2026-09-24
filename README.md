# CMS OTC - Mail Task Dashboard

نسخة جديدة من الداشبورد بنفس منطق المعالجة الأصلي (processAll / fixTime / الفلاتر) بدون أي تغيير فيه،
مع إضافة: تسجيل دخول بصلاحيات، ربط قائمة الموظفين بشيت جوجل، تصدير Excel، ولوحة تحكم للأدمن.

## 1. محتويات المشروع
```
CMS-OTC-Dashboard/
├── index.html                  # الواجهة (تسجيل الدخول + الداشبورد)
├── style.css                   # الألوان (أبيض + #8D38C9) والأزرار ثلاثية الأبعاد
├── app.js                      # كل المنطق (نفس القديم + الإضافات الجديدة)
└── google-apps-script/
    └── Code.gs                 # الكود اللي هتحطه في Apps Script بتاع الشيت
```

## 2. الإعداد في Google Sheet (مهم قبل أي حاجة)

افتح نفس الشيت المرتبط بالرابط:
`https://script.google.com/macros/s/AKfycbytna6gz9sE31tX_i00k1v9MAp9QyvKZwGYTao_r9B8qIVW1DcXUdyOl_Zb_kmcsFO2/exec`

### شيت "Structure" (قائمة الموظفين)
لازم يكون فيه صف عناوين، والبيانات من الصف الثاني:

| A (اختياري) | B: Login ID | C: Agent Name | D (اختياري) | E (اختياري) | F: Group |
|---|---|---|---|---|---|
|  | 611737 | Abanoub Raafat Wanas Zakhary |  |  | OTC |
|  | 654982 | Ahmed Attia Allah Galal Ahmed |  |  | OTC |

- **B = Login ID**، **F = Group** بالظبط زي ما طلبت.
- الداشبورد ده بيجيب **بس الصفوف اللي Group بتاعها = "OTC"** (باقي المجموعات زي Chat أو Voice ممكن تتسجل في نفس الشيت لدواشبورد تانية من غير ما تظهر هنا).
- افترضت إن اسم الموظف في **عمود C** — لو الاسم في عمود تاني قولّي أعدّل السطر `row[2]` في `Code.gs`.

### شيت جديد اسمه "Users" (اليوزرات والصلاحيات)
ده الشيت اللي هيتحط فيه اليوزر والباسورد والصلاحية زي ما طلبت:

| A: Username | B: Password | C: Full Name | D: Role | E: Active |
|---|---|---|---|---|
| admin | ****** | Ahmed Mostafa | Admin | Yes |
| agent1 | ****** | Sara Ali | Agent | Yes |

- **Role = Admin** → بيشوف زرار "⚙ إدارة قائمة الموظفين" ويقدر يضيف/يعدل/يمسح من نفس صفحة الويب، والتعديل بيروح على شيت Structure فورًا (مرآة كاملة).
- **Role = Agent** → بيستخدم الداشبورد عادي بدون صلاحية التعديل على القائمة.
- **Active = No** → الحساب موقوف مؤقتًا من غير ما تمسحه.

> ملحوظة أمان: الباسورد متخزن نص عادي في الشيت لغرض البساطة والسرعة. لو حابب مستوى حماية أعلى (تشفير الباسورد) قولّي وأظبطه.

## 3. تحديث الـ Apps Script
`Code.gs` دلوقتي **مبني فوق الكود اللي عندك بالفعل** — مفيش حاجة اتمسحت أو اتغيرت من الـ `doGet` القديم بتاعك (لسه بيشتغل بـ `?tab=` زي ما هو تمامًا). المضاف بس: شرط جديد بيتفعّل لما يوصل `action=getStructure`، بالإضافة لـ `doPost` كامل (مكنش موجود قبل كده) لتسجيل الدخول وإدارة الموظفين.

خطوات التحديث:
1. من الشيت: **Extensions → Apps Script**.
2. استبدل محتوى الملف بالكامل بمحتوى `google-apps-script/Code.gs` الجديد (فيه كل كودك القديم + الإضافات).
3. لو السكريبت مش مربوط تلقائيًا بالشيت، غيّر `SpreadsheetApp.getActiveSpreadsheet()` إلى `SpreadsheetApp.openById("SHEET_ID")`.
4. **Deploy → Manage deployments → ✏️ Edit → New version → Deploy** (عشان نفس رابط الـ `/exec` يشتغل بالكود الجديد فورًا).
5. تأكد إن الصلاحية "Who has access" لسه **Anyone**.
6. لو اسم تاب قائمة الموظفين عندك مش "Structure"، غيّر قيمة `STRUCTURE_TAB` في أول السكريبت.

## 4. تشغيل الموقع محليًا / من GitHub Pages
- الرابط الحالي للـ API متحط بالفعل داخل `app.js` (متغير `API_URL`) — مفيش حاجة تانية تتعدل.
- ارفع الملفات دي كلها (`index.html`, `style.css`, `app.js`) في الـ Repo بتاعك على GitHub.
- لو عايز رابط مباشر شغال أونلاين: فعّل **GitHub Pages** من إعدادات الـ Repo (Settings → Pages → Branch: main → Save)، وهيديك رابط زي:
  `https://<username>.github.io/<repo-name>/`

### خطوات رفع الملفات على GitHub (Git)
```bash
cd CMS-OTC-Dashboard
git init
git add .
git commit -m "CMS OTC Mail Task - white/purple theme + sheet-based login + excel export"
git branch -M main
git remote add origin https://github.com/<username>/<repo-name>.git
git push -u origin main
```
(أو ببساطة: من صفحة الـ Repo على GitHub اضغط **Add file → Upload files** واسحب الملفات الأربعة.)

## 5. اللي اتضاف في هذه النسخة
- ✅ الثيم اتغير بالكامل لأبيض + بنفسجي `#8D38C9` مع أزرار **3D** (ظل سفلي بيدوس لما تضغط عليها).
- ✅ شاشة **تسجيل دخول** (يوزر/باسورد) بتتحقق من شيت "Users".
- ✅ قائمة الموظفين (Structure) بقت بتتسحب **لايف من الشيت** بدل ما تكون ثابتة جوه الكود، وبتفلتر بس Group = "OTC".
- ✅ زرار **Export to Excel** بيصدّر نفس الجدول المعروض بنفس الأعمدة.
- ✅ لوحة **أدمن** لإضافة/تعديل/حذف الموظفين — أي تعديل من الويب بيج بيتسجل فورًا في شيت Structure (مرآة كاملة).
- ✅ بانر "Activation Team — CMS OTC Team - Mail Task" ظاهر أعلى الشريط الجانبي.
- 🔒 منطق المعالجة نفسه (processAll, fixTime, toggleFilter, resetAll) **متغيرش فيه ولا سطر واحد**.

## 6. افتراضات محتاجة تأكيدك
1. اسم الموظف موجود في **عمود C** بشيت Structure — لو غلط قولّي.
2. صلاحيتين بس دلوقتي: `Admin` و `Agent` — لو محتاج صلاحية ثالثة (مثلاً Supervisor) قولّي أضيفها.
3. نص رسالة "Activation Team" حطيتها كبانر ثابت أعلى القائمة — لو قصدك حاجة تانية (مثلاً إشعار popup بعد الدخول) وضّحلي وأظبطها.
