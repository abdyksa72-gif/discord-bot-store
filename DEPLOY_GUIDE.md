# دليل الرفع على Railway عبر GitHub

## الخطوات الكاملة

---

## 1. رفع المشروع على GitHub

1. اذهب إلى [github.com](https://github.com) وسجل دخول
2. اضغط **New repository**
3. سمّه مثلاً `discord-bot-store`
4. اضغط **Create repository**
5. في Replit: اذهب إلى قائمة **Version Control** (أيقونة Git في الشريط الجانبي)
6. اربط الـ repo الجديد واضغط **Push**

---

## 2. إنشاء مشروع على Railway

1. اذهب إلى [railway.app](https://railway.app) وسجل بحساب GitHub
2. اضغط **New Project** ← **Deploy from GitHub repo**
3. اختر الـ repository اللي رفعته
4. Railway سيكتشف `railway.toml` تلقائياً

---

## 3. إضافة خدمة البوت

1. في مشروع Railway، اضغط **New Service** ← **GitHub Repo** (نفس الـ repo)
2. غير اسم الخدمة إلى `discord-bot`
3. في إعدادات الخدمة، غير **Dockerfile Path** إلى `Dockerfile.bot`
4. أضف متغير بيئة:
   - `DISCORD_TOKEN` = توكن البوت من Discord Developer Portal

---

## 4. إعداد Auto-Deploy

Railway يعمل تلقائياً! أي push على GitHub ← Railway يعيد البناء والنشر.

لإعداد GitHub Actions (اختياري للـ CD المتقدم):
1. في Railway: اذهب إلى **Settings** ← **Tokens** ← أنشئ token جديد
2. في GitHub repo: اذهب إلى **Settings** ← **Secrets** ← أضف:
   - `RAILWAY_TOKEN` = التوكن من Railway

---

## 5. النتيجة النهائية

| الخدمة | الوصف |
|--------|--------|
| **website** | موقع البيع — يعمل 24/7 على Railway |
| **discord-bot** | البوت — يعمل 24/7 على Railway |

**أي تعديل في Replit → Push إلى GitHub → Railway يحدث تلقائياً خلال دقائق ✅**

---

## ملاحظة مهمة

تأكد من إضافة هذه المتغيرات في خدمة البوت على Railway:
- `DISCORD_TOKEN` — توكن البوت (من Discord Developer Portal)
