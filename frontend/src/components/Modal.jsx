import React from 'react';

export default function Modal({ children, onClose, showCloseButton = true }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4 animate-fade-in-up">
        {showCloseButton && (
          <div className="flex justify-end">
            <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}