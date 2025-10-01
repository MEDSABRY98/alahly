# دليل نشر التطبيق على الإنترنت

## نظرة عامة
تم إعداد التطبيق ليعمل على الإنترنت مع الحفاظ على النسخة المكتبية. التطبيق يستخدم نفس الكود مع service مختلف حسب البيئة.

## الملفات المضافة

### Backend API
- `backend/server.js` - خادم Express للتعامل مع Google Sheets
- `backend/package.json` - dependencies للـ backend
- `backend/env.example` - مثال على متغيرات البيئة

### Web Services
- `src/services/sheetsServiceWeb.js` - نسخة ويب من sheetsService
- `src/services/sheetsServiceFactory.js` - يحدد أي service يستخدم

### إعدادات النشر
- `vercel.json` - إعدادات Vercel
- `netlify.toml` - إعدادات Netlify
- `env.example` - متغيرات البيئة

## كيفية النشر

### 1. النشر على Vercel (الأسهل)

#### الخطوات:
1. اذهب إلى [vercel.com](https://vercel.com)
2. سجل دخول بحساب GitHub
3. اربط repository الخاص بك
4. في إعدادات Environment Variables، أضف:
   ```
   GOOGLE_SHEET_ID=1xNBqgK5q5GRAfMn-teH64WFLvGNVtBXppxLgzWi8GeY
   GOOGLE_PROJECT_ID=your-project-id
   GOOGLE_PRIVATE_KEY_ID=your-private-key-id
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
   GOOGLE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
   GOOGLE_CLIENT_ID=your-client-id
   ```
5. اضغط Deploy

#### النتيجة:
- رابط مباشر مثل: `https://your-app.vercel.app`
- تحديث تلقائي عند رفع كود جديد

### 2. النشر على Netlify

#### الخطوات:
1. اذهب إلى [netlify.com](https://netlify.com)
2. اربط repository الخاص بك
3. في إعدادات Environment Variables، أضف نفس المتغيرات أعلاه
4. اضغط Deploy

#### النتيجة:
- رابط مباشر مثل: `https://your-app.netlify.app`

### 3. النشر على GitHub Pages

#### الخطوات:
1. ارفع الكود على GitHub
2. اذهب إلى Settings > Pages
3. اختر Source: GitHub Actions
4. أنشئ ملف `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Build
        run: npm run build-web
        env:
          REACT_APP_API_URL: ${{ secrets.REACT_APP_API_URL }}
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./build
```

## إعداد Backend منفصل (اختياري)

إذا كنت تريد backend منفصل:

### Heroku
1. أنشئ app جديد على Heroku
2. ارفع مجلد `backend/` كـ subdirectory
3. أضف متغيرات البيئة في Heroku
4. احصل على URL الخاص بالـ backend
5. حدث `REACT_APP_API_URL` في frontend

### Railway
1. اذهب إلى [railway.app](https://railway.app)
2. اربط repository
3. اختر مجلد `backend/`
4. أضف متغيرات البيئة
5. احصل على URL الخاص بالـ backend

## اختبار التطبيق

### محلياً:
```bash
# تشغيل Backend
npm run backend-dev

# تشغيل Frontend (في terminal آخر)
npm run web
```

### على الإنترنت:
1. اذهب للرابط الخاص بك
2. تأكد من أن البيانات تظهر
3. جرب إضافة مباراة جديدة
4. تأكد من أن البيانات تحفظ في Google Sheets

## استكشاف الأخطاء

### مشكلة: البيانات لا تظهر
- تأكد من أن Google Sheets API مفعل
- تأكد من أن Service Account له صلاحيات
- تأكد من أن Sheet ID صحيح

### مشكلة: لا يمكن حفظ البيانات
- تأكد من أن Backend يعمل
- تأكد من أن متغيرات البيئة صحيحة
- تحقق من console في المتصفح

### مشكلة: CORS Error
- تأكد من أن Backend يسمح بـ CORS
- تأكد من أن API URL صحيح

## ملاحظات مهمة

1. **الكود مشترك**: أي تعديل في `src/` سيعمل في النسختين
2. **البيانات مشتركة**: نفس Google Sheet للنسختين
3. **الأداء**: النسخة الويب قد تكون أبطأ قليلاً بسبب HTTP requests
4. **الأمان**: تأكد من عدم كشف Google credentials في الكود

## الدعم

إذا واجهت أي مشاكل:
1. تحقق من console في المتصفح
2. تحقق من logs في Vercel/Netlify
3. تأكد من أن جميع المتغيرات صحيحة
