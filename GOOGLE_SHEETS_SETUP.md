# Google Sheets Setup Guide

## خطوات إعداد Google Sheets للاتصال بالتطبيق

### 1. إنشاء مشروع Google Cloud

1. اذهب إلى [Google Cloud Console](https://console.cloud.google.com/)
2. أنشئ مشروع جديد أو اختر مشروع موجود
3. سجل اسم المشروع (مثل: football-database-app)

### 2. تفعيل Google Sheets API

1. في لوحة التحكم، اذهب إلى "APIs & Services" > "Library"
2. ابحث عن "Google Sheets API"
3. اضغط على "Enable"

### 3. إنشاء Service Account

1. اذهب إلى "APIs & Services" > "Credentials"
2. اضغط على "Create Credentials" > "Service Account"
3. أدخل اسم Service Account (مثل: football-database-service)
4. اضغط "Create and Continue"
5. في الخطوة التالية، اختر "Editor" كدور
6. اضغط "Continue" ثم "Done"

### 4. إنشاء مفتاح API

1. في صفحة "Credentials"، ابحث عن Service Account الذي أنشأته
2. اضغط على اسم Service Account
3. اذهب إلى تبويب "Keys"
4. اضغط "Add Key" > "Create new key"
5. اختر "JSON" كالنوع
6. اضغط "Create" - سيتم تحميل ملف JSON

### 5. إعداد ملف Credentials.json

1. انسخ الملف المحمل إلى المجلد التالي:
   ```
   D:\Footballdatabase\src\credentials\Credentials.json
   ```

2. تأكد من أن الملف يحتوي على البيانات التالية:
   ```json
   {
     "type": "service_account",
     "project_id": "your-project-id",
     "private_key_id": "your-private-key-id",
     "private_key": "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n",
     "client_email": "your-service-account@your-project-id.iam.gserviceaccount.com",
     "client_id": "your-client-id",
     "auth_uri": "https://accounts.google.com/o/oauth2/auth",
     "token_uri": "https://oauth2.googleapis.com/token",
     "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
     "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project-id.iam.gserviceaccount.com"
   }
   ```

### 6. إنشاء Google Sheet

1. اذهب إلى [Google Sheets](https://sheets.google.com/)
2. أنشئ جدول جديد
3. أضف الأوراق التالية:

#### أوراق البيانات المطلوبة:

**1. ورقة Matches:**
```
A1: Date
B1: Time
C1: Home Team
D1: Away Team
E1: Home Score
F1: Away Score
G1: Competition
H1: Venue
I1: Referee
J1: Notes
```

**2. ورقة Players:**
```
A1: Name
B1: Team
C1: Position
D1: Jersey Number
E1: Date of Birth
F1: Nationality
```

**3. ورقة Teams:**
```
A1: Name
B1: League
C1: Country
D1: Founded
E1: Stadium
```

**4. ورقة Goals:**
```
A1: Match ID
B1: Player ID
C1: Team
D1: Minute
E1: Assist Player ID
F1: Goal Type
G1: Is Own Goal
```

**5. ورقة GoalkeeperStats:**
```
A1: Match ID
B1: Player ID
C1: Team
D1: Saves
E1: Goals Conceded
F1: Clean Sheet
```

**6. ورقة Penalties:**
```
A1: Match ID
B1: Player ID
C1: Team
D1: Minute
E1: Type
F1: Converted
G1: Saved
```

### 7. مشاركة الجدول مع Service Account

1. في Google Sheet، اضغط على "Share" (مشاركة)
2. أضف البريد الإلكتروني الخاص بـ Service Account
   (الذي يظهر في ملف Credentials.json تحت "client_email")
3. اختر "Editor" كصلاحية
4. اضغط "Send"

### 8. إعداد متغيرات البيئة

1. انسخ ملف `.env.example` إلى `.env`
2. أضف معرف الجدول:
   ```
   REACT_APP_GOOGLE_SHEET_ID=your_sheet_id_here
   ```

   (يمكنك الحصول على معرف الجدول من رابط Google Sheet)

### 9. اختبار الاتصال

1. شغل التطبيق:
   ```bash
   npm run electron-dev
   ```

2. تأكد من أن البيانات تظهر بشكل صحيح في التطبيق

## استكشاف الأخطاء

### خطأ "Permission denied"
- تأكد من مشاركة الجدول مع Service Account
- تأكد من صحة ملف Credentials.json

### خطأ "Sheet not found"
- تأكد من صحة معرف الجدول في ملف .env
- تأكد من وجود الأوراق بالاسم الصحيح

### خطأ "Authentication failed"
- تأكد من صحة بيانات Service Account
- تأكد من تفعيل Google Sheets API

## ملاحظات مهمة

- احتفظ بملف Credentials.json في مكان آمن
- لا تشارك ملف Credentials.json مع أي شخص
- أضف ملف Credentials.json إلى .gitignore لتجنب رفعه إلى Git
