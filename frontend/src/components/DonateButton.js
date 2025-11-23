import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';

export default function DonateButton() {
  const [showDonateDialog, setShowDonateDialog] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        className="flex items-center gap-2 bg-gradient-to-r from-pink-50 to-red-50 border-pink-300 hover:from-pink-100 hover:to-red-100"
        onClick={() => setShowDonateDialog(true)}
      >
        <Heart className="h-4 w-4 text-red-500 fill-red-500" />
        <span className="text-red-600 font-medium">Donate Now</span>
      </Button>

      <Dialog open={showDonateDialog} onOpenChange={setShowDonateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Heart className="h-6 w-6 text-red-500 fill-red-500" />
              Support Our Cause
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* QR Code */}
            <div className="flex justify-center">
              <img 
                src="https://customer-assets.emergentagent.com/job_b993a1cd-0342-422a-a31c-05b5efa36ac0/artifacts/71y2napr_donateforneedy%40icici-583x1024.jpg" 
                alt="Donate QR Code" 
                className="max-w-xs border-2 border-gray-200 rounded-lg shadow-lg"
              />
            </div>

            {/* Bank Details */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-blue-900 mb-4">Bank Account Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Account Name:</span>
                  <span className="font-bold text-gray-900">SHARANYA DEVELOPMENT FOUNDATION</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Account Number:</span>
                  <span className="font-bold text-gray-900 font-mono">197401000613</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">IFSC Code:</span>
                  <span className="font-bold text-gray-900 font-mono">ICIC0001974</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Account Type:</span>
                  <span className="font-bold text-gray-900">SAVINGS ACCOUNT</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Bank Name:</span>
                  <span className="font-bold text-gray-900">ICICI Bank</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Branch:</span>
                  <span className="font-bold text-gray-900">Bandlaguda Jagir</span>
                </div>
              </div>
            </div>

            {/* Thank You Message */}
            <div className="text-center bg-gradient-to-r from-pink-50 to-red-50 border border-pink-200 rounded-lg p-4">
              <p className="text-gray-700 font-medium">
                🙏 Thank you for your generous contribution!
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Your donation helps us provide quality education to students in need.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
