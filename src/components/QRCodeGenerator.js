import React, { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

export default function QRCodeGenerator({ table }) {
    const qrRef = useRef();

    // The new URL points to a specific table, not just the shop.
    // Replace 'localhost' with your IP for testing or your domain for production.
    const qrCodeURL = `https://komsyte-restro-frontend.onrender.com/menu?shopId=${table._id}`;

    const downloadQRCode = (e) => {
        e.preventDefault();
        const canvas = qrRef.current;
        if (canvas) {
            const image = canvas.toDataURL("image/png");
            const anchor = document.createElement("a");
            anchor.href = image;
            anchor.download = `QR-Code-${table.name}.png`;
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
