import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Item, QuickItem, StoreConfig, Order, StatusMessage, StatusType } from './types';
import { LS_QUICK_ITEMS_KEY, LS_HISTORY_KEY, LS_CONFIG_KEY, DEFAULT_QUICK_ITEMS, DEFAULT_STORE_CONFIG, UNIT_OPTIONS } from './constants';

// UTILITY FUNCTIONS
const loadFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const storedValue = localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : defaultValue;
  } catch (error) {
    console.error(`Error loading from localStorage key "${key}":`, error);
    return defaultValue;
  }
};

const saveToLocalStorage = <T,>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving to localStorage key "${key}":`, error);
  }
};

const formatNumber = (num: number | string): string => {
  // FIX: Replaced String(num) with `${num}` to avoid "This expression is not callable" error, which can happen if the global `String` is shadowed.
  const number = parseFloat(`${num}`) || 0;
  return number.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// HELPER COMPONENTS (Defined outside App to prevent re-creation on render)

const StatusBanner: React.FC<{ message: StatusMessage | null }> = ({ message }) => {
  if (!message) return null;
  const bgColor = message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  return (
    <div className={`mt-3 p-3 text-sm rounded-xl text-center ${bgColor}`} role="alert">
      {message.text}
    </div>
  );
};


export default function App() {
  // --- STATE MANAGEMENT ---
  const [items, setItems] = useState<Item[]>([{ id: 1, name: '', qty: 1, unit: 'ชุด', price: 0 }]);
  const [quickItems, setQuickItems] = useState<QuickItem[]>(() => loadFromLocalStorage(LS_QUICK_ITEMS_KEY, DEFAULT_QUICK_ITEMS));
  const [orderHistory, setOrderHistory] = useState<Order[]>(() => loadFromLocalStorage(LS_HISTORY_KEY, []));
  const [storeConfig, setStoreConfig] = useState<StoreConfig>(() => loadFromLocalStorage(LS_CONFIG_KEY, DEFAULT_STORE_CONFIG));
  
  const [patientName, setPatientName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingFee, setShippingFee] = useState(0);
  const [discount, setDiscount] = useState(0);

  const [paymentChannel, setPaymentChannel] = useState<'โอนเงิน' | 'เก็บเงินปลายทาง'>('โอนเงิน');
  const [paymentStatus, setPaymentStatus] = useState<'รอชำระ' | 'สำเร็จ'>('รอชำระ');
  
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [isEditPanelVisible, setIsEditPanelVisible] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState('');

  // --- PERSISTENCE EFFECTS ---
  useEffect(() => { saveToLocalStorage(LS_QUICK_ITEMS_KEY, quickItems); }, [quickItems]);
  useEffect(() => { saveToLocalStorage(LS_HISTORY_KEY, orderHistory); }, [orderHistory]);
  useEffect(() => { saveToLocalStorage(LS_CONFIG_KEY, storeConfig); }, [storeConfig]);
  
  // --- DERIVED STATE & MEMOS ---
  const finalPrice = useMemo(() => {
    const subtotal = items.reduce((acc, item) => acc + (item.qty * item.price), 0);
    const total = subtotal + shippingFee - discount;
    return total < 0 ? 0 : total;
  }, [items, shippingFee, discount]);
  
  // --- HANDLER FUNCTIONS ---
  const showStatus = useCallback((text: string, type: StatusType = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3000);
  }, []);

  const handleAddItemRow = () => {
    setItems(prev => [...prev, { id: Date.now(), name: '', qty: 1, unit: 'ชุด', price: 0 }]);
  };

  const handleAddItemFromMenu = (name: string, unit: string) => {
     setItems(prev => [...prev, { id: Date.now(), name, qty: 1, unit, price: 0 }]);
  }

  const handleRemoveItemRow = (id: number) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };
  
  const handleItemChange = (id: number, field: keyof Item, value: string | number) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleClearForm = () => {
    setItems([{ id: 1, name: '', qty: 1, unit: 'ชุด', price: 0 }]);
    setPatientName('');
    setCustomerPhone('');
    setShippingAddress('');
    setShippingFee(0);
    setDiscount(0);
    setGeneratedMessage('');
    showStatus('ล้างฟอร์มสำเร็จแล้ว', 'success');
  };
  
  const handleSaveCurrentOrder = () => {
      const orderItems = items
        .filter(i => i.name && i.qty > 0)
        .map(({ id, ...rest }) => rest);
        
      if (orderItems.length === 0) {
        showStatus("ไม่สามารถบันทึกได้: ไม่มีรายการสินค้าในฟอร์ม", 'error');
        return;
      }

      const newOrder: Order = {
        timestamp: Date.now(),
        patientName, customerPhone, shippingAddress,
        shippingFee, discount,
        items: orderItems,
        finalPrice
      };

      setOrderHistory(prev => [newOrder, ...prev.slice(0, 9)]);
      showStatus("บันทึกรายการสำเร็จ!", 'success');
  };

  const handleLoadOrder = (index: number) => {
      const order = orderHistory[index];
      if (!order) return;
      
      setPatientName(order.patientName);
      setCustomerPhone(order.customerPhone);
      setShippingAddress(order.shippingAddress);
      setShippingFee(order.shippingFee);
      setDiscount(order.discount);
      setItems(order.items.map((item, i) => ({ ...item, id: Date.now() + i })));

      showStatus(`โหลดรายการสั่งซื้อของ ${order.patientName || 'ลูกค้า'} สำเร็จ!`, 'success');
  };

  const handleDeleteOrderHistory = (index: number) => {
      setOrderHistory(prev => prev.filter((_, i) => i !== index));
      showStatus("ลบประวัติรายการสำเร็จ", 'success');
  };

  const handleGenerateMessage = () => {
      const validItems = items.filter(i => i.name && i.qty > 0);
      if (validItems.length === 0) return showStatus("กรุณากรอกรายการสินค้าให้ครบถ้วน อย่างน้อย 1 รายการ", 'error');
      if (!patientName) return showStatus("กรุณากรอกชื่อคนไข้/ลูกค้า", 'error');
      if (!shippingAddress) return showStatus("กรุณากรอกที่อยู่สำหรับจัดส่ง", 'error');
      if (!customerPhone) return showStatus("กรุณากรอกเบอร์โทรศัพท์ลูกค้า", 'error');
      
      const itemSubtotal = validItems.reduce((acc, item) => acc + (item.qty * item.price), 0);
      
      const header = "📦 สรุปรายการ";
      const itemLines = validItems.map(item => `- ${item.name} ${item.qty} ${item.unit} (${formatNumber(item.price)} บ./หน่วย)`).join('\n');
      
      const priceDetails = [
          `ยอดรวมสินค้า: ${formatNumber(itemSubtotal)} บาท`,
          shippingFee > 0 ? `ค่าจัดส่ง: ${formatNumber(shippingFee)} บาท` : null,
          discount > 0 ? `ส่วนลดรวม: -${formatNumber(discount)} บาท` : null,
      ].filter(Boolean).join('\n');

      const totalLine = `\n💰 ยอดรวมสุทธิ ${formatNumber(finalPrice)} บาท`;
      const customerInfo = `\n--- ข้อมูลลูกค้าและจัดส่ง ---\n🧑 ชื่อคนไข้/ลูกค้า: ${patientName}\n📱 เบอร์โทรลูกค้า: ${customerPhone}\n🏠 ที่อยู่สำหรับจัดส่ง:\n${shippingAddress}`;
      
      let paymentInfo = `\n--- รายละเอียดการชำระ ---\n💸 ช่องทาง: ${paymentChannel}\n${paymentStatus === 'สำเร็จ' ? '✅ สถานะ: ชำระเงินสำเร็จ' : '⏳ สถานะ: รอชำระ'}`;
      let closingMessage = "";

      if (paymentChannel === 'โอนเงิน') {
          if (paymentStatus === 'รอชำระ') {
              closingMessage = "⚠️ กรุณาโอนเงินและส่งสลิปเพื่อยืนยันการสั่งซื้อ ขอบคุณครับ 🙏";
          } else {
              closingMessage = "ขอบคุณที่ใช้บริการครับ 🙏";
          }
      } else {
          closingMessage = "📢 จัดส่งแบบเก็บเงินปลายทาง (COD) รบกวนเตรียมเงินสดให้พร้อมรับสินค้าครับ 🙏";
      }

      const contactLine = storeConfig.contactPhone ? `📞 ติดต่อร้านค้า: ${storeConfig.contactPhone}` : '';
      
      const finalMessage = [header, itemLines, "\n--- สรุปราคา ---", priceDetails, totalLine, customerInfo, paymentInfo, contactLine, "\n" + closingMessage]
          .filter(Boolean).join('\n').trim();

      setGeneratedMessage(finalMessage);
      showStatus("สร้างข้อความสำเร็จ!", 'success');
  };

  const handleCopyMessage = () => {
    if (!generatedMessage) {
      showStatus("ไม่มีข้อความให้คัดลอก", 'error');
      return;
    }
    navigator.clipboard.writeText(generatedMessage)
      .then(() => showStatus("คัดลอกข้อความลงคลิปบอร์ดแล้ว", 'success'))
      .catch(() => showStatus("คัดลอกไม่สำเร็จ", 'error'));
  };

  const inputClasses = "w-full p-2.5 bg-white text-black border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 transition duration-150 text-base";
  const labelClasses = "block text-sm font-medium text-black mb-2";

  // --- JSX RENDER ---
  return (
    <div className="p-4 md:p-8 min-h-screen text-black">
      <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-2xl p-6 md:p-8 border border-gray-200">
        <h1 className="text-3xl font-bold text-black mb-2 flex items-center">
          <svg className="w-8 h-8 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path></svg>
          ตัวช่วยสร้างข้อความ LINE OA
        </h1>
        <p className="text-gray-600 mb-6 border-b pb-4">
          สร้างข้อความสรุปรายการสั่งซื้อที่ครบถ้วน (ชื่อคนไข้, รายการ, ชำระเงิน, ที่อยู่, เบอร์ลูกค้า, ราคารวม, ติดต่อ)
        </p>

        <div className="space-y-6">
          {/* Quick Add & History Section */}
          <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-inner space-y-4">
            {/* Quick Add */}
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-black flex items-center">
                    <svg className="w-5 h-5 mr-2 text-yellow-600" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM3 11a1 1 0 100-2H2a1 1 0 100 2h1zM16 11a1 1 0 100-2h-1a1 1 0 100 2h1zM8 2a2 2 0 00-2 2v1H5a2 2 0 00-2 2v2H2a1 1 0 100 2h1v1a2 2 0 002 2h1v1a2 2 0 002 2h4a2 2 0 002-2v-1h1a2 2 0 002-2v-2h1a1 1 0 100-2h-1V7a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H8zM7 7h6v6H7V7z"></path></svg>
                    รายการยา/สินค้าที่ใช้บ่อย
                </h3>
                <button onClick={() => setIsEditPanelVisible(!isEditPanelVisible)} className="py-1 px-3 text-sm bg-gray-800 text-white rounded-lg hover:bg-black transition duration-150 shadow-md flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                  {isEditPanelVisible ? 'ซ่อน' : 'จัดการรายการ'}
                </button>
            </div>
            <div className="flex flex-wrap gap-2">
                {quickItems.map((item, index) => (
                    <button key={index} onClick={() => handleAddItemFromMenu(item.name, item.unit)} className="py-1.5 px-3 text-sm bg-gray-100 hover:bg-gray-200 rounded-full text-black font-medium transition duration-150 shadow-sm border border-gray-300">
                      + {item.name} ({item.unit})
                    </button>
                ))}
            </div>

            {/* Edit Quick Add Panel */}
            {isEditPanelVisible && (
              <div className="p-4 border-t border-gray-200 bg-white rounded-b-xl">
                 <h4 className="text-md font-bold mb-3 text-black">🛠️ เพิ่ม/แก้ไข รายการที่ใช้บ่อย</h4>
                 <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-2">
                    {quickItems.map((item, index) => (
                      <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg shadow-sm text-sm">
                        <span className="text-black">{item.name} ({item.unit})</span>
                        <button onClick={() => setQuickItems(prev => prev.filter((_, i) => i !== index))} className="text-red-500 hover:text-red-700 transition duration-150" title="ลบ">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                    ))}
                 </div>
                 <form onSubmit={(e) => {
                     e.preventDefault();
                     const form = e.target as HTMLFormElement;
                     const name = (form.elements.namedItem('newQuickItemName') as HTMLInputElement).value;
                     const unit = (form.elements.namedItem('newQuickItemUnit') as HTMLSelectElement).value;
                     if(name) {
                        setQuickItems(prev => [...prev, {name, unit}]);
                        form.reset();
                     }
                 }} className="flex gap-2 items-center">
                    <input type="text" name="newQuickItemName" placeholder="ชื่อสินค้าใหม่" className={`${inputClasses} flex-grow text-sm`}/>
                    <select name="newQuickItemUnit" className={`${inputClasses} w-24 p-2 text-sm`}>
                        {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <button type="submit" className="py-2 px-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-150 text-sm flex-shrink-0">เพิ่ม</button>
                 </form>
              </div>
            )}
            
            {/* Order History */}
            <div className="pt-4 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-black flex items-center mb-2">
                   <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zm12 9a1 1 0 11-2 0 1 1 0 012 0zm-7 1a1 1 0 100-2 1 1 0 000 2zm-3-1a1 1 0 11-2 0 1 1 0 012 0z"></path></svg>
                   ประวัติรายการสั่งซื้อ
                </h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {orderHistory.map((order, index) => (
                    <div key={order.timestamp} className="flex items-center space-x-1">
                      <button onClick={() => handleLoadOrder(index)} className="py-1 px-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-full text-black font-medium transition duration-150 border border-gray-300">
                        โหลด: {order.patientName || 'รายการที่ไม่มีชื่อ'} ({formatNumber(order.finalPrice)} บ.)
                      </button>
                      <button onClick={() => handleDeleteOrderHistory(index)} className="text-red-500 hover:text-red-700 p-1 rounded-full bg-gray-100/50">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </div>
                  ))}
                </div>
                <button onClick={handleSaveCurrentOrder} className="w-full py-2 px-3 text-sm bg-gray-800 text-white rounded-lg hover:bg-black transition duration-150 shadow-md flex items-center justify-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-3m-1-4l-3-3m0 0l-3 3m3-3v12"></path></svg>
                    บันทึกรายการนี้
                </button>
            </div>
          </div>

          <button onClick={handleClearForm} className="w-full py-2 px-4 border border-red-500 text-red-600 font-semibold rounded-lg hover:bg-red-50 transition duration-150 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex items-center justify-center">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            ล้างฟอร์มนี้
          </button>

          {/* Item List Input */}
          <div>
            <label className={labelClasses}>1. รายการสินค้า</label>
            <div className="grid grid-cols-12 gap-3 mb-2 text-xs font-semibold text-gray-500 uppercase">
              <span className="col-span-4">ชื่อรายการ/รายละเอียด</span>
              <span className="col-span-2 text-center">จำนวน</span>
              <span className="col-span-2 text-center">หน่วย</span>
              <span className="col-span-3 text-right">ราคาต่อหน่วย</span>
              <span className="col-span-1"></span>
            </div>
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={item.id} className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-4">
                    <input type="text" value={item.name} onChange={(e) => handleItemChange(item.id, 'name', e.target.value)} placeholder="พิมพ์ชื่อสินค้า/รายการ" className={inputClasses} />
                  </div>
                  <div className="col-span-2">
                     <input type="number" value={item.qty} onChange={(e) => handleItemChange(item.id, 'qty', e.target.valueAsNumber || 0)} min="1" className={`${inputClasses} text-center`} />
                  </div>
                  <div className="col-span-2">
                    <select value={item.unit} onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)} className={inputClasses}>
                      {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                   <div className="col-span-3">
                     <input type="number" value={item.price} onChange={(e) => handleItemChange(item.id, 'price', e.target.valueAsNumber || 0)} min="0" step="0.01" className={`${inputClasses} text-right`} />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button onClick={() => handleRemoveItemRow(item.id)} className="p-2 rounded-lg transition duration-150 bg-red-500 text-white hover:bg-red-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={handleAddItemRow} className="mt-3 w-full py-2 px-4 border border-green-500 text-green-600 font-semibold rounded-lg hover:bg-green-50 transition duration-150 flex items-center justify-center">
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
              เพิ่มรายการสินค้า
            </button>
          </div>
          
          {/* Payment Section */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>2. ช่องทางการชำระเงิน</label>
              <select value={paymentChannel} onChange={(e) => setPaymentChannel(e.target.value as any)} className={`${inputClasses} text-lg`}>
                <option value="โอนเงิน">โอนเงิน (แนบสลิป)</option>
                <option value="เก็บเงินปลายทาง">เก็บเงินปลายทาง (COD)</option>
              </select>
            </div>
            <div>
              <label className={labelClasses}>3. สถานะการชำระเงิน 🕒</label>
              <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as any)} className={`${inputClasses} text-lg`}>
                <option value="รอชำระ">รอชำระ</option>
                <option value="สำเร็จ">ชำระเงินสำเร็จ</option>
              </select>
            </div>
          </div>
          
          {/* Customer Details */}
          <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <label className={labelClasses}>4.1 ชื่อคนไข้/ลูกค้า 🧑</label>
                      <input type="text" value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="กรอกชื่อคนไข้/ลูกค้า" className={`${inputClasses} text-lg`} />
                  </div>
                  <div>
                      <label className={labelClasses}>4.2 เบอร์โทรศัพท์ลูกค้า 📱</label>
                      <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="กรอกเบอร์โทรศัพท์ลูกค้า" className={`${inputClasses} text-lg`} />
                  </div>
              </div>
              <div>
                  <label className={labelClasses}>4.3 ที่อยู่สำหรับจัดส่ง</label>
                  <textarea value={shippingAddress} onChange={e => setShippingAddress(e.target.value)} rows={4} placeholder="กรอกที่อยู่สำหรับจัดส่งสินค้า" className={`${inputClasses} resize-none`}></textarea>
              </div>
          </div>
          
          {/* Price & Contact Section */}
          <div className="grid grid-cols-2 gap-4">
              <div>
                  <label className={labelClasses}>5.1 ค่าจัดส่ง 🚚</label>
                  <div className="relative">
                      <input type="number" value={shippingFee} onChange={e => setShippingFee(e.target.valueAsNumber || 0)} placeholder="เช่น 50" min="0" className={`${inputClasses} text-lg pr-16`} />
                      <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">บาท</span>
                  </div>
              </div>
              <div>
                  <label className={labelClasses}>5.2 ส่วนลดรวม 🏷️</label>
                  <div className="relative">
                      <input type="number" value={discount} onChange={e => setDiscount(e.target.valueAsNumber || 0)} placeholder="เช่น 20" min="0" className={`${inputClasses} text-lg pr-16`} />
                      <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">บาท</span>
                  </div>
              </div>
          </div>
          <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-md">
              <div className="flex justify-between items-center text-xl font-bold text-black">
                  <span>ยอดรวมสุทธิที่ต้องชำระ 💰</span>
                  <span>{formatNumber(finalPrice)} บาท</span>
              </div>
          </div>
          <div>
              <label className={labelClasses}>5.4 เบอร์โทรศัพท์ติดต่อ (ของร้านค้า) 📞</label>
              <input type="tel" value={storeConfig.contactPhone} onChange={e => setStoreConfig(s => ({...s, contactPhone: e.target.value}))} placeholder="เช่น 099-1234567" className={`${inputClasses} text-lg`} />
          </div>

          <button onClick={handleGenerateMessage} className="w-full py-3 px-4 bg-green-600 text-white font-semibold text-lg rounded-xl hover:bg-green-700 transition duration-200 shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 active:bg-green-800">
            <svg className="w-6 h-6 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
            สร้างข้อความ
          </button>
        </div>
        
        {generatedMessage && (
          <div className="mt-6 border-t pt-6">
            <h3 className="text-lg font-semibold text-black flex items-center mb-2">
              <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              ข้อความที่สร้าง (แก้ไขได้)
            </h3>
            <textarea
              className="w-full p-3 border border-gray-300 rounded-lg h-64 resize-y bg-white text-black"
              value={generatedMessage}
              onChange={(e) => setGeneratedMessage(e.target.value)}
            />
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <button onClick={handleCopyMessage} className="flex-1 py-2 px-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition duration-150 flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                คัดลอกข้อความ
              </button>
              <button onClick={() => setGeneratedMessage('')} className="flex-1 sm:flex-none py-2 px-4 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition duration-150">
                ซ่อน
              </button>
            </div>
          </div>
        )}

        <StatusBanner message={statusMessage} />

      </div>
    </div>
  );
}
