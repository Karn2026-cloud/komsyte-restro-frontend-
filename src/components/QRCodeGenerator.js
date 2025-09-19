import React, { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react'; 

export default function QRCodeGenerator({ shop }) {
    const qrRef = useRef();

    // ✅ FIX: Change 'localhost:5000' to your live domain and port
    // For example: 'https://your-restaurant-app.com/api/public/menu?shopId='
    const qrCodeURL = `https://komsyte-restro-backend.onrender.com:5000/api/public/menu?shopId=${shop._id}`;

    const downloadQRCode = (e) => {
        e.preventDefault();
        const canvas = qrRef.current; 
        if (canvas) {
            const image = canvas.toDataURL("image/png");
            const anchor = document.createElement("a");
            anchor.href = image;
            anchor.download = `QR-Code-${shop.shopName}.png`;
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
        }
    };

    return (
        <div className="qr-code-wrapper">
            <QRCodeCanvas
                ref={qrRef}
                value={qrCodeURL}
                size={180}
                level={"H"}
                includeMargin={true}
            />
            <button className="download-qr-btn" onClick={downloadQRCode} style={{marginTop: '15px'}}>
                Download QR Code
            </button>
        </div>
    );
}
