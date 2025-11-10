// import { memo } from 'react';
// import OrderSummary from '../../../components/web/OrderSummary';

// interface StableOrderSummaryProps {
//     cart: any[];
//     cartTotal: number;
//     itemCount: number;
//     gst: number;
//     qst: number;
//     deliveryFee: number;
//     finalTotal: number;
// }

// // Use React.memo with custom comparison
// const StableOrderSummary = memo(function StableOrderSummary({
//     cart,
//     cartTotal,
//     itemCount,
//     gst,
//     qst,
//     deliveryFee,
//     finalTotal
// }: StableOrderSummaryProps) {
//     return (
//         <OrderSummary
//             cart={cart}
//             cartTotal={cartTotal}
//             itemCount={itemCount}
//             gst={gst}
//             qst={qst}
//             deliveryFee={deliveryFee}
//             finalTotal={finalTotal}
//         />
//     );
// }, 
// // Custom comparison function to prevent unnecessary re-renders
// (prevProps, nextProps) => {
//     return (
//         prevProps.cart === nextProps.cart &&
//         prevProps.cartTotal === nextProps.cartTotal &&
//         prevProps.itemCount === nextProps.itemCount &&
//         prevProps.gst === nextProps.gst &&
//         prevProps.qst === nextProps.qst &&
//         prevProps.deliveryFee === nextProps.deliveryFee &&
//         prevProps.finalTotal === nextProps.finalTotal
//     );
// });

// export default StableOrderSummary;