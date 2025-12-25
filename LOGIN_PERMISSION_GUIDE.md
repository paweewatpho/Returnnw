# 🔐 Login & Permission System - คู่มือการใช้งาน

## 📋 **ภาพรวม**

ระบบ ReturnNeosiam Pro ได้รับการอัพเกรดเพิ่มระบบ Authentication และ Role-Based Access Control (RBAC) ที่สมบูรณ์แบบ

---

## 👥 **User Roles ทั้งหมด (7 Roles)**

| Role | ชื่อภาษาไทย | จำนวนแนะนำ | สี Badge |
|------|------------|-----------|----------|
| `ADMIN` | ผู้ดูแลระบบ | 1-2 คน | 🔴 แดง |
| `NCR_OPERATOR` | พนักงาน NCR | 2-3 คน | 🔵 น้ำเงิน |
| `COL_OPERATOR` | พนักงาน Collection | 2-3 คน | 🟠 ส้ม |
| `REQUEST_ENTRY` | พนักงานคีย์ใบสั่งงาน | 1-2 คน | 🟡 เหลือง |
| `QC_OPERATOR` | พนักงาน QC | 1-2 คน | 🟢 เขียว |
| `CLOSURE_OPERATOR` | พนักงานปิดงาน | 1 คน | 🟣 ม่วง |
| `VIEWER` | ผู้ดูข้อมูล | 1-2 คน | ⚫ เทา |

---

## 🚀 **การเข้าสู่ระบบ**

### **วิธีที่ 1: Login ด้วย Email/Password**

1. เปิดเว็บไซต์: `http://localhost:3000`
2. กรอก Email และ Password
3. คลิก "เข้าสู่ระบบ"

**Password สำหรับทุก Account (Development):**
```
password123
```

### **วิธีที่ 2: Quick Login (Development Mode)**

1. เลือก User ที่ต้องการจากรายการด้านขวา
2. คลิกที่ Card ของ User
3. ระบบจะ Login อัตโนมัติ

---

## 📧 **รายการ User Accounts**

### **1. ADMIN**
```
Email: admin@neosiam.com
Password: password123
ชื่อ: ผู้ดูแลระบบ (Admin)
```

### **2. NCR Operators**
```
Email: ncr.staff1@neosiam.com
Password: password123
ชื่อ: สมชาย ใจดี (NCR Staff)

Email: ncr.staff2@neosiam.com
Password: password123
ชื่อ: สมหญิง รักงาน (NCR Staff)
```

### **3. COL Operators**
```
Email: col.staff1@neosiam.com
Password: password123
ชื่อ: วิชัย ขยัน (COL Staff)

Email: col.staff2@neosiam.com
Password: password123
ชื่อ: สุดา มานะ (COL Staff)
```

### **4. REQUEST_ENTRY**
```
Email: request.entry1@neosiam.com
Password: password123
ชื่อ: ส้มโอ จันทร์เพ็ญ (Data Entry)

Email: request.entry2@neosiam.com
Password: password123
ชื่อ: มะนาว สดใส (Data Entry)
```

### **5. QC Operator**
```
Email: qc.inspector@neosiam.com
Password: password123
ชื่อ: ชัยวัฒน์ ละเอียด (QC Inspector)
```

### **6. CLOSURE Operator**
```
Email: closure.staff@neosiam.com
Password: password123
ชื่อ: ปิยะ สมบูรณ์ (Closure Staff)
```

### **7. VIEWER**
```
Email: finance@neosiam.com
Password: password123
ชื่อ: บัญชี การเงิน (Finance Viewer)
```

---

## 🔑 **Permission Matrix**

### **ADMIN**
- ✅ ทุกอย่าง (Full Access)

### **NCR_OPERATOR**
- ✅ Step 1: Return Request (NCR)
- ✅ Step 2: NCR Logistics
- ✅ NCR System (Full Access)
- ✅ NCR Report (Full Access)
- 👁️ อื่นๆ (Read-Only)

### **COL_OPERATOR**
- ✅ Step 1: Return Request (COL)
- ✅ COL Step 2: Job Accept
- ✅ COL Step 3: Physical Receive
- ✅ COL Step 4: Consolidation
- ✅ Step 2: NCR Logistics (Shared)
- ✅ COL Report (Full Access)
- 👁️ อื่นๆ (Read-Only)

### **REQUEST_ENTRY**
- ✅ Step 1: Return Request (COL) เท่านั้น
- ✅ Collection System (Create Request)
- 👁️ อื่นๆ (Read-Only)

### **QC_OPERATOR**
- ✅ Step 3: Hub Receive
- ✅ Step 4: QC
- ✅ Step 5: Docs
- 👁️ อื่นๆ (Read-Only)

### **CLOSURE_OPERATOR**
- ✅ Step 6: Closure เท่านั้น
- 👁️ อื่นๆ (Read-Only)

### **VIEWER**
- 👁️ ทุกอย่าง (Read-Only)
- ❌ Settings (No Access)

---

## 🛠️ **ฟีเจอร์ที่เพิ่มเข้ามา**

### **1. Login Page**
- 🎨 UI สวยงาม modern design
- 🔐 Email/Password Authentication
- 👁️ แสดง/ซ่อน Password
- ⚡ Quick Login สำหรับ Development
- 🎭 Animated Background

### **2. Permission System**
- ✅ Role-Based Access Control (RBAC)
- ✅ Permission Helper Functions
- ✅ UI ปรับตามสิทธิ์อัตโนมัติ
- ✅ Sidebar กรอง Menu ตาม Role

### **3. Sidebar Enhancements**
- 👤 แสดงข้อมูล User & Role
- 🎨 Badge สีตาม Role
- 🚪 ปุ่ม Logout ใช้งานได้
- 🔍 Menu กรองตามสิทธิ์

### **4. LocalStorage Persistence**
- 💾 บันทึก Login Session
- 🔄 Auto-login เมื่อ Refresh
- 🚪 Clear Session เมื่อ Logout

---

## 📁 **ไฟล์ที่สร้างใหม่**

```
returnneosiam-pro/
├── utils/
│   └── permissions.ts          # Permission Helper Functions
├── data/
│   └── mockUsers.ts            # Mock Users สำหรับ Development
├── components/
│   └── LoginPage.tsx           # Login Page UI
└── types.ts (อัพเดท)           # เพิ่ม UserRole ใหม่
```

---

## 📁 **ไฟล์ที่แก้ไข**

```
returnneosiam-pro/
├── AuthContext.tsx             # อัพเดท login function
├── App.tsx                     # เพิ่ม LoginPage & Permission Check
└── components/
    └── Sidebar.tsx             # เพิ่ม User Info & Logout
```

---

## 🔧 **การทดสอบ**

### **1. ทดสอบ Login**
```bash
# เปิด Browser ไปที่
http://localhost:3000

# ทดสอบ Login ด้วย
Email: admin@neosiam.com
Password: password123
```

### **2. ทดสอบ Permissions**
```
1. Login ด้วย NCR_OPERATOR
   → ตรวจสอบว่าเห็นแค่ NCR Menu
   
2. Login ด้วย VIEWER
   → ตรวจสอบว่าไม่มีปุ่ม Edit/Save
   
3. Login ด้วย REQUEST_ENTRY
   → ตรวจสอบว่าสร้าง COL Request ได้เท่านั้น
```

### **3. ทดสอบ Logout**
```
1. คลิกปุ่ม "ออกจากระบบ" ใน Sidebar
2. Confirm การ Logout
3. ตรวจสอบว่ากลับไปหน้า Login
```

---

## 🚨 **การแก้ไขปัญหา**

### **ปัญหา: Login ไม่ได้**
```
✅ ตรวจสอบ Email ว่าถูกต้อง
✅ ตรวจสอบ Password (ต้องเป็น password123)
✅ เปิด Console ดู Error
```

### **ปัญหา: Logout แล้วยัง Login อยู่**
```
✅ เคลียร์ LocalStorage
   - เปิด DevTools > Application > Local Storage
   - ลบ returnneo_user
✅ Refresh Browser (F5)
```

### **ปัญหา: Menu บางตัวหายไป**
```
✅ ตรวจสอบ Role ของ User
✅ ดู Permission Matrix ว่า Role นี้มีสิทธิ์หรือไม่
✅ Login ด้วย ADMIN เพื่อเข้าถึงทุกอย่าง
```

---

## 📚 **การใช้งาน Permission Functions**

### **ตรวจสอบสิทธิ์แก้ไข Step**
```typescript
import { canEditStep } from './utils/permissions';
import { useAuth } from './AuthContext';

const { user } = useAuth();
const canEdit = canEditStep(user?.role, 1, true); // Step 1, NCR

if (canEdit) {
  // แสดงปุ่ม Save
} else {
  // แสดงเฉพาะ Read-Only
}
```

### **ตรวจสอบสิทธิ์เข้าถึง Module**
```typescript
import { getModuleAccess } from './utils/permissions';

const access = getModuleAccess(user?.role, 'NCR_SYSTEM');
// 'FULL' | 'READ' | 'NONE'

if (access === 'FULL') {
  // แสดงปุ่ม Edit/Delete
} else if (access === 'READ') {
  // แสดงเฉพาะข้อมูล
}
```

### **ตรวจสอบสิทธิ์ Export รายงาน**
```typescript
import { canExportReport } from './utils/permissions';

if (canExportReport(user?.role)) {
  // แสดงปุ่ม Export Excel
}
```

---

## 🔐 **Security Best Practices**

### **สำหรับ Development:**
- ✅ ใช้ Mock Users ได้ตามสบาย
- ✅ Password เป็น `password123` ทั้งหมด
- ✅ Quick Login เปิดใช้งาน

### **สำหรับ Production:**
- ⚠️ **ปิด Quick Login** (ลบออกจาก LoginPage.tsx)
- ⚠️ **เปลี่ยน Password** ให้แข็งแรง (8+ ตัวอักษร, ตัวพิมพ์ใหญ่/เล็ก, ตัวเลข, สัญลักษณ์)
- ⚠️ **ใช้ Firebase Authentication** แทน Mock Login
- ⚠️ **เข้ารหัส Password** ด้วย bcrypt หรือ Firebase
- ⚠️ **เพิ่ม Rate Limiting** ป้องกัน Brute Force
- ⚠️ **ใช้ HTTPS** เสมอ

---

## 📞 **ติดต่อ**

หากมีปัญหาหรือคำถาม:
- 📧 Email: it.support@neosiam.com
- 💬 Line: @neosiam-support

---

## 🎉 **สรุป**

ระบบ Login และ Permission ทำงานครบถ้วนแล้ว:

✅ Login Page สวยงาม
✅ 7 User Roles พร้อม Permissions
✅ Mock Users 10 คน
✅ Permission Helper Functions
✅ Sidebar แสดง User Info
✅ Logout ใช้งานได้
✅ LocalStorage Persistence
✅ Role-Based Menu Filtering

**พร้อมใช้งานได้เลย! 🚀**
