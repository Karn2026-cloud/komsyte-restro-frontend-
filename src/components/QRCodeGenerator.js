import React, { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";

export default function QRCodeGenerator({ shop }) {
  const qrWrapperRef = useRef();

  // ✅ Use current domain dynamically for production
  const qrCodeURL = `${window.location.origin}/menu?shopId=${shop._id}`;

  const downloadQRCode = (e) => {
    e.preventDefault();

    const canvas = qrWrapperRef.current.querySelector("canvas"); // get canvas inside wrapper
    if (canvas) {
      const image = canvas.toDataURL("image/png");
      const anchor = document.createElement("a");
      anchor.href = image;
      anchor.download = `QR-Code-${shop.shopName || "restaurant"}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    }
  };

  return (
    <div className="qr-code-wrapper" ref={qrWrapperRef} style={{ textAlign: "center" }}>
      <QRCodeCanvas
        value={qrCodeURL}
        size={200}        // Slightly larger for clarity
        level="H"         // High error correction
        includeMargin={true}
      />
      <button
        className="download-qr-btn"
        onClick={downloadQRCode}
        style={{
          marginTop: "15px",
          padding: "10px 16px",
          borderRadius: "8px",
          border: "none",
          backgroundColor: "#007bff",
          color: "#fff",
          fontWeight: "600",
          cursor: "pointer",
        }}
      >
        Download QR Code
      </button>
    </div>
  );
}
