import React, { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react'; 

// Notice the prop name is now 'shop'
export default function QRCodeGenerator({ shop }) {
    const qrRef = useRef();

    // The new URL points to the shop, not a specific table.
    // Replace 'localhost' with your IP for testing or your domain for production.
    const qrCodeURL = `http://localhost:3000/menu?shopId=${shop._id}`;

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
                size={180} // Made it larger for the main display
                level={"H"}
                includeMargin={true}
            />
            <button className="download-qr-btn" onClick={downloadQRCode} style={{marginTop: '15px'}}>
                Download QR Code
            </button>
        </div>
    );
}