
import { CollectionOrder, ReturnRequest, ShipmentManifest } from '../types';

export const mockDrivers = [
    { id: 'D-001', name: 'นายสมชาย ใจดี (Mr. Somchai)', plate: '1กข-1234' },
    { id: 'D-002', name: 'นายวิชัย รวดเร็ว (Mr. Wichai)', plate: '2คต-5678' },
    { id: 'D-003', name: 'นายประดิษฐ์ คิดรอบคอบ (Mr. Pradit)', plate: '3จฉ-9012' },
];

export const mockReturnRequests: ReturnRequest[] = [
    {
        id: 'RMA-2023-001',
        documentNo: 'R-2023-001',
        branch: 'พิษณุโลก',
        invoiceNo: 'INV-1001',
        controlDate: '2023-12-01',
        tmNo: 'TM-999',
        customerCode: 'CUS-001',
        customerName: 'ร้านค้าเจริญกิจ (Charoen Kit)',
        customerAddress: '123 ถ.สุขุมวิท',
        province: 'กรุงเทพฯ',
        contactPerson: 'คุณสมศักดิ์',
        contactPhone: '081-234-5678',
        itemsSummary: 'Mouse x10, Keyboard x5',
        status: 'APPROVED_FOR_PICKUP'
    },
    {
        id: 'RMA-2023-002',
        documentNo: 'R-2023-002',
        branch: 'นครสวรรค์',
        invoiceNo: 'INV-1002',
        controlDate: '2023-12-02',
        tmNo: 'TM-888',
        customerCode: 'CUS-001',
        customerName: 'ร้านค้าเจริญกิจ (Charoen Kit)',
        customerAddress: '123 ถ.สุขุมวิท',
        province: 'กรุงเทพฯ',
        contactPerson: 'คุณสมศักดิ์',
        contactPhone: '081-234-5678',
        itemsSummary: 'Monitor x2',
        status: 'APPROVED_FOR_PICKUP'
    },
    {
        id: 'RMA-2023-003',
        documentNo: 'R-2023-003',
        branch: 'เชียงใหม่',
        invoiceNo: 'INV-1005',
        controlDate: '2023-12-05',
        tmNo: 'TM-777',
        customerCode: 'CUS-002',
        customerName: 'บริษัท ไทยเทรดดิ้ง (Thai Trading)',
        customerAddress: '789 ถ.บางนา-ตราด',
        province: 'สมุทรปราการ',
        contactPerson: 'คุณเอก',
        contactPhone: '02-111-2222',
        itemsSummary: 'Printer x1',
        status: 'APPROVED_FOR_PICKUP'
    },
    {
        id: 'RMA-2023-004',
        documentNo: 'R-2023-004',
        branch: 'พิษณุโลก',
        invoiceNo: 'INV-1009',
        controlDate: '2023-12-10',
        tmNo: 'TM-666',
        customerCode: 'CUS-003',
        customerName: 'ห้างหุ้นส่วนจำกัด สยาม (Siam Ltd.)',
        customerAddress: '456 ถ.เพชรเกษม',
        province: 'นครปฐม',
        contactPerson: 'คุณวิไล',
        contactPhone: '089-987-6543',
        itemsSummary: 'Laptop x5, Mouse x5',
        status: 'PICKUP_SCHEDULED'
    }
];

export const mockCollectionOrders: CollectionOrder[] = [
    {
        id: 'COL-202312-001',
        driverId: 'D-001',
        linkedRmaIds: ['RMA-2023-004'],
        pickupLocation: {
            name: 'ห้างหุ้นส่วนจำกัด สยาม (Siam Ltd.)',
            address: '456 ถ.เพชรเกษม นครปฐม',
            contactName: 'คุณวิไล',
            contactPhone: '089-987-6543'
        },
        pickupDate: '2023-12-16',
        packageSummary: {
            totalBoxes: 3,
            description: 'อุปกรณ์คอมพิวเตอร์'
        },
        status: 'PENDING',
        vehiclePlate: '1กข-1234',
        createdDate: '2023-12-11'
    },
    {
        id: 'COL-202312-002',
        driverId: 'D-002',
        linkedRmaIds: ['RMA-2023-005'],
        pickupLocation: {
            name: 'ร้านบิวตี้ช็อป',
            address: '999 ถ.ลาดพร้าว',
            contactName: 'คุณสวย',
            contactPhone: '087-654-3210'
        },
        pickupDate: '2023-12-12',
        packageSummary: {
            totalBoxes: 2,
            description: 'เครื่องสำอาง'
        },
        status: 'COLLECTED', // Ready for consolidation
        vehiclePlate: '2คต-5678',
        createdDate: '2023-12-05',
        proofOfCollection: {
            timestamp: '2023-12-12T10:00:00Z',
            signatureUrl: 'signed',
            photoUrls: ['https://images.unsplash.com/photo-1595246140625-573b715d1128?q=80&w=200&auto=format&fit=crop']
        }
    }
];

export const mockShipments: ShipmentManifest[] = [];
