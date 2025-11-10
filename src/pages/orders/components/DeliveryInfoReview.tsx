// import { memo, useCallback } from "react";
// import { useTranslation } from "react-i18next";
// import type { CustomerFormData } from "../CustomerInformation";

// interface DeliveryInfoReviewProps {
//     formData: CustomerFormData;
//     onEdit: () => void;
// }

// const DeliveryInfoReviewComponent = ({ formData, onEdit }: DeliveryInfoReviewProps) => {
//     const { t } = useTranslation();

//     console.log("Rendering DeliveryInfoReview");

//     // Memoize the edit handler
//     const handleEdit = useCallback(() => {
//         onEdit();
//     }, [onEdit]);

//     // Memoize the delivery information display
//     const deliveryInfoDisplay = formData.deliveryMethod === "pickup" ? (
//         <p>Pickup — Sherbrooke, QC</p>
//     ) : (
//         <>
//             <p>
//                 {formData.address}
//                 {formData.city ? `, ${formData.city}` : ""}{formData.area ? ` (${formData.area})` : ""}, QC {formData.zipCode}
//             </p>
//             {formData.deliveryInstructions && (
//                 <p className="text-white/60">
//                     {t("checkoutPage.instructions", "Instructions")}: {formData.deliveryInstructions}
//                 </p>
//             )}
//         </>
//     );

//     return (
//         <div className="bg-white/5 border border-white/10 rounded-sm p-6">
//             <div className="flex items-center justify-between mb-4">
//                 <h3 className="text-lg font-light text-white tracking-wide">
//                     {t("checkoutPage.deliveryInfo", "Delivery Information")}
//                 </h3>
//                 <button
//                     type="button"
//                     onClick={handleEdit}
//                     className="text-white/60 hover:text-white text-sm"
//                 >
//                     {t("checkoutPage.edit", "Edit")}
//                 </button>
//             </div>
//             <div className="text-white/80 font-light text-sm space-y-2">
//                 <p>{formData.firstName} {formData.lastName}</p>
//                 <p>{formData.email}</p>
//                 <p>{formData.phone}</p>
//                 {deliveryInfoDisplay}
//             </div>
//         </div>
//     );
// };

// // Custom comparison function to prevent unnecessary re-renders
// const arePropsEqual = (prevProps: DeliveryInfoReviewProps, nextProps: DeliveryInfoReviewProps) => {
//     // Only re-render if form data actually changed
//     return (
//         prevProps.formData.firstName === nextProps.formData.firstName &&
//         prevProps.formData.lastName === nextProps.formData.lastName &&
//         prevProps.formData.email === nextProps.formData.email &&
//         prevProps.formData.phone === nextProps.formData.phone &&
//         prevProps.formData.deliveryMethod === nextProps.formData.deliveryMethod &&
//         prevProps.formData.address === nextProps.formData.address &&
//         prevProps.formData.city === nextProps.formData.city &&
//         prevProps.formData.area === nextProps.formData.area &&
//         prevProps.formData.zipCode === nextProps.formData.zipCode &&
//         prevProps.formData.deliveryInstructions === nextProps.formData.deliveryInstructions &&
//         prevProps.onEdit === nextProps.onEdit
//     );
// };

// export const DeliveryInfoReview = memo(DeliveryInfoReviewComponent, arePropsEqual);