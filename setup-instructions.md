# تعليمات إصلاح مشاكل البرنامج

## المشاكل المكتشفة:

1. **ملف الاعتماد مفقود**: `src/credentials/Credentials.json`
2. **مفتاح API غير صحيح**: في ملف البيئة
3. **مشكلة في تنسيق ملف البيئة**: تم إصلاحها

## خطوات الإصلاح:

### 1. إنشاء ملف الاعتماد (Credentials.json)

يجب إنشاء ملف `src/credentials/Credentials.json` مع البيانات التالية:

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

### 2. الحصول على بيانات الاعتماد من Google Cloud:

1. اذهب إلى [Google Cloud Console](https://console.cloud.google.com/)
2. أنشئ مشروع جديد أو اختر مشروع موجود
3. فعّل Google Sheets API
4. أنشئ Service Account
5. حمّل ملف JSON للاعتماد
6. انسخ محتوى الملف إلى `src/credentials/Credentials.json`

### 3. مشاركة Google Sheet:

1. اذهب إلى Google Sheet الخاص بك
2. اضغط على "Share" (مشاركة)
3. أضف البريد الإلكتروني الخاص بـ Service Account
4. اختر "Editor" كصلاحية

### 4. إعداد متغيرات البيئة:

أنشئ ملف `.env` في المجلد الرئيسي:

```
REACT_APP_GOOGLE_SHEET_ID=1zeSlEN7VS2S6KPZH7_uvQeeY3Iu5INUyi12V0_Wi9G4
REACT_APP_GOOGLE_API_KEY=your_actual_api_key_here
REACT_APP_APP_NAME=Football Database
```

### 5. تشغيل التطبيق:

```bash
npm install
npm run electron-dev
```

## ملاحظات مهمة:

- تأكد من أن Google Sheets API مفعّل في مشروعك
- تأكد من مشاركة الـ Sheet مع Service Account
- احتفظ بملف الاعتماد في مكان آمن
- لا تشارك ملف الاعتماد مع أي شخص
