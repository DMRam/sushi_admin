import React, { useState } from 'react';

interface DeliveryInfo {
  fee: number;
}

interface FormData {
  firstName: string;
  email?: string;
  phone?: string;
  address?: string;
  deliveryMethod: string;
  city?: string;
  area?: string;
  zipCode?: string;
  deliveryInstructions?: string;
}

interface PaymentMethodSelectorProps {
  paymentMethod?: 'stripe' | 'clover' | 'card';
  onPaymentMethodChange: (method: 'stripe' | 'clover' | 'card') => void;
  finalTotal: number;
  isProcessing: boolean;
  onPlaceOrder: () => Promise<void> | void;
  onBack: () => void;
  // Optional props for validation and data if needed in this component
  validate?: (formData: FormData, deliveryInfo: DeliveryInfo) => boolean;
  formData?: FormData;
  deliveryInfo?: DeliveryInfo;
}

export const PaymentMethodSelectorII: React.FC<PaymentMethodSelectorProps> = ({
  paymentMethod = "card",
  onPaymentMethodChange,
  finalTotal,
  isProcessing,
  onPlaceOrder,
  onBack,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'stripe' | 'clover' | 'card'>(paymentMethod);

  const handleMethodChange = (method: 'stripe' | 'clover' | 'card') => {
    setSelectedMethod(method);
    onPaymentMethodChange(method);
  };

  const handlePayment = async () => {
    if (selectedMethod === 'card' || selectedMethod === 'stripe') {
      // Use existing Stripe flow
      await onPlaceOrder();
    } else if (selectedMethod === 'clover') {
      // Trigger Clover payment
      await handleCloverPayment();
    }
  };

  const handleCloverPayment = async () => {
    // This will be implemented in the checkout flow
    console.log('Initiating Clover payment');
    // We'll create a separate function for this
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">
        Select Payment Method
      </h3>
      
      {/* Payment Method Options */}
      <div className="space-y-3 mb-6">
        <div 
          className={`flex items-center p-4 rounded-lg cursor-pointer transition-colors ${
            selectedMethod === 'stripe' 
              ? 'bg-blue-500/20 border border-blue-500' 
              : 'bg-gray-700 hover:bg-gray-600 border border-gray-600'
          }`}
          onClick={() => handleMethodChange('stripe')}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white mr-3">
            <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 1.227 0 1.99.49 2.214 1.544l3.015-1.258c-.527-1.764-1.89-2.795-3.898-2.795-2.118 0-3.589 1.118-3.589 2.81 0 1.543 1.177 2.304 3.453 3.234 2.417.98 3.018 1.823 3.018 2.805 0 .987-.884 1.605-2.095 1.605-1.336 0-2.386-.527-2.936-1.498l-3.188 1.263c.64 2.066 2.357 3.088 4.377 3.088 2.538 0 4.085-1.278 4.085-3.226 0-1.812-1.365-2.612-3.728-3.466z"/>
            </svg>
          </div>
          <div>
            <p className="font-medium text-white">Credit/Debit Card (Stripe)</p>
            <p className="text-sm text-gray-400">Visa, Mastercard, American Express</p>
          </div>
        </div>

        <div 
          className={`flex items-center p-4 rounded-lg cursor-pointer transition-colors ${
            selectedMethod === 'clover' 
              ? 'bg-green-500/20 border border-green-500' 
              : 'bg-gray-700 hover:bg-gray-600 border border-gray-600'
          }`}
          onClick={() => handleMethodChange('clover')}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white mr-3">
            <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <div>
            <p className="font-medium text-white">Clover Payment</p>
            <p className="text-sm text-gray-400">Interac & Cards with Quebec tax support</p>
          </div>
        </div>
      </div>

      {/* Payment Summary */}
      <div className="border-t border-gray-700 pt-4 mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400">Total Amount</span>
          <span className="text-2xl font-bold text-white">
            ${finalTotal.toFixed(2)} CAD
          </span>
        </div>
        <p className="text-sm text-gray-400">
          Includes GST (5%) + QST (9.975%) and delivery fees
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <button
          onClick={onBack}
          disabled={isProcessing}
          className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Back to Information
        </button>
        
        <button
          onClick={handlePayment}
          disabled={isProcessing}
          className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isProcessing ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              Processing...
            </>
          ) : selectedMethod === 'clover' ? (
            'Pay with Clover'
          ) : (
            'Pay with Card'
          )}
        </button>
      </div>
    </div>
  );
};

// Optional: Export the prop types for use elsewhere
export type { PaymentMethodSelectorProps };