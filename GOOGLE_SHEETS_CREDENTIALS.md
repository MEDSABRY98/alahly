# إعداد Google Sheets Credentials

## نظرة عامة
تم تضمين ملف `Credentials.json` افتراضي في البرنامج، لكن يجب استبداله بملف الاعتماد الحقيقي من Google Cloud Console.

## الخطوات المطلوبة

### 1. إنشاء Service Account في Google Cloud Console
1. اذهب إلى [Google Cloud Console](https://console.cloud.google.com/)
2. اختر مشروع أو أنشئ مشروع جديد
3. فعّل Google Sheets API
4. اذهب إلى "IAM & Admin" > "Service Accounts"
5. أنشئ Service Account جديد
6. حمّل ملف JSON key

### 2. استبدال ملف الاعتماد
**للمستخدمين العاديين:**
1. شغّل البرنامج
2. اذهب إلى مجلد التطبيق: `C:\Program Files\Football Database\resources\credentials\`
3. استبدل `Credentials.json` بالملف الحقيقي من Google

**للمطورين:**
1. ضع ملف الاعتماد الحقيقي في `src/credentials/Credentials.json`
2. أعد بناء البرنامج باستخدام `npm run build-win`

### 3. مشاركة Google Sheet
1. افتح Google Sheet المطلوب
2. انقر على "Share" (مشاركة)
3. أضف email الـ Service Account (من ملف Credentials.json)
4. امنح صلاحية "Editor"

## ملاحظات مهمة
- ⚠️ **لا تشارك ملف Credentials.json مع أحد** - يحتوي على مفاتيح سرية
- ✅ احتفظ بنسخة احتياطية من الملف في مكان آمن
- 🔄 يمكنك تحديث الملف في أي وقت دون إعادة تثبيت البرنامج

## استكشاف الأخطاء

### خطأ: "Credentials file not found"
**الحل:** تأكد من وجود الملف في المجلد الصحيح

### خطأ: "Invalid credentials"
**الحل:** تأكد من صحة محتوى الملف وعدم تلفه

### خطأ: "Permission denied"
**الحل:** تأكد من مشاركة Google Sheet مع Service Account

## الملفات المطلوبة
- `Credentials.json` - ملف الاعتماد من Google Cloud Console
- Google Sheet ID - معرف الجدول (مثل: 1xNBqgK5q5GRAfMn-teH64WFLvGNVtBXppxLgzWi8GeY)

---

**تم تضمين ملف اعتماد افتراضي في البرنامج! 🎉**

الآن يمكنك توزيع البرنامج مباشرة، والمستخدمون يحتاجون فقط لاستبدال ملف الاعتماد.
