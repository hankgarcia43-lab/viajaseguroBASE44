import React from 'react';
import { base44 } from '@/api/base44Client';

const UserNotRegisteredError = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-6">
      <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-2xl">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-amber-100">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">Acceso no autorizado</h1>
          <p className="text-slate-600 mb-6">
            Tu cuenta no está registrada en esta aplicación. Contacta al administrador para solicitar acceso.
          </p>
          <button
            onClick={() => base44.auth.logout('/')}
            className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;