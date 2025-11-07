import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCartStore } from "../stores/cartStore";
import {
    getFunctions,
    httpsCallable,
    type HttpsCallableResult,
} from "firebase/functions";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { LandingCTAFooter } from "./landing/components/LandingCTAFooter";
import CustomerInformation from "../components/web/CustomerInformation";
import OrderSummary from "../components/web/OrderSummary";
import type {
    CashOrderResponse,
} from "../types/stripe_interfaces";
import PaymentMethodSelector from "./PaymentMethodSelector";
import { AuthModal } from "./components/AuthModal";
import { auth } from "../firebase/firebase";
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";

interface FormData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    zipCode: string;
    deliveryInstructions: string;
    paymentMethod: string;
}

interface CartItem {
    id?: string;
    name: string;
    price: number;
    quantity?: number;
    description?: string;
    category?: string;
    image?: string;
    imageUrl?: string;
    thumbnail?: string;
    mainImage?: string;
    photo?: string;
    img?: string;
    picture?: string;
    images?: string[];
    imageUrls?: string[];
}

interface CustomerInfo {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    zipCode: string;
    deliveryInstructions: string;
    province: string;
}

interface Totals {
    subtotal: number;
    gst: number;
    qst: number;
    deliveryFee: number;
    finalTotal: number;
}

interface UserProfile {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
    points: number;
    address?: string;
    city?: string;
    zip_code?: string;
}

export default function CheckoutPage() {
    const cart = useCartStore((state) => state.cart);
    const clearCart = useCartStore((state) => state.clearCart);
    const { t } = useTranslation();
    const navigate = useNavigate();

    const safeCart: CartItem[] = Array.isArray(cart) ? cart : [];
    const itemCount = safeCart.reduce((sum, item) => sum + (item?.quantity || 0), 0);
    const cartTotal = safeCart.reduce(
        (sum, item) => sum + (item?.price || 0) * (item?.quantity || 0),
        0
    );

    const [isProcessing, setIsProcessing] = useState(false);
    const [orderComplete, setOrderComplete] = useState(false);
    const [orderNumber, setOrderNumber] = useState("");
    const [currentStep, setCurrentStep] = useState<"info" | "review" | "payment">("info");

    // Authentication & Points State
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoadingUser, setIsLoadingUser] = useState(true);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [authForm, setAuthForm] = useState({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: ''
    });
    const [isAuthLoading, setIsAuthLoading] = useState(false);
    const [authError, setAuthError] = useState('');

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
        // checkUser();
    }, []);

    // Add Firebase auth state listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                // User is signed in with Firebase
                checkUser();
            } else {
                // User is signed out
                setUser(null);
                setIsLoadingUser(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const [formData, setFormData] = useState<FormData>({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        zipCode: "",
        deliveryInstructions: "",
        paymentMethod: "card",
    });

    const gst = Number((cartTotal * 0.05).toFixed(2));
    const qst = Number((cartTotal * 0.09975).toFixed(2));
    const tax = gst + qst;
    const deliveryFee = cartTotal > 25 ? 0 : 4.99;
    const finalTotal = Number((cartTotal + tax + deliveryFee).toFixed(2));

    // Calculate points for this order (example: 1 point per $1 spent)
    const pointsEarned = Math.floor(cartTotal);

    // Authentication Functions
    const checkUser = async () => {
        try {
            const currentUser = auth.currentUser;

            console.log('Checking user in checkout:', currentUser);

            if (currentUser) {

                console.log('User is logged in with UID:', currentUser.uid);
                // Fetch client profile from Supabase using Firebase UID
                const { data: clientProfile, error } = await supabase
                    .from('client_profiles')
                    .select('*')
                    .eq('firebase_uid', currentUser.uid)
                    .single();

                if (error) {
                    console.error('Error fetching client profile:', error);
                    setIsLoadingUser(false);
                    return;
                }

                console.log('Fetched client profile:', clientProfile);

                if (clientProfile) {
                    // Split full_name into first and last name
                    const fullName = clientProfile.full_name || '';
                    const nameParts = fullName.split(' ');
                    const firstName = nameParts[0] || '';
                    const lastName = nameParts.slice(1).join(' ') || '';

                    setUser({
                        id: clientProfile.id,
                        email: clientProfile.email,
                        first_name: firstName,
                        last_name: lastName,
                        phone: clientProfile.phone,
                        points: clientProfile.points,
                        address: clientProfile.address,
                        city: clientProfile.city,
                        zip_code: clientProfile.zip_code
                    });

                    // Auto-fill form with user data
                    setFormData(prev => ({
                        ...prev,
                        firstName: firstName,
                        lastName: lastName,
                        email: clientProfile.email || '',
                        phone: clientProfile.phone || '',
                        address: clientProfile.address || '',
                        city: clientProfile.city || '',
                        zipCode: clientProfile.zip_code || ''
                    }));
                    setIsLoadingUser(false);
                }
            } else {
                setIsLoadingUser(false);
            }
        } catch (error) {
            console.error('Error checking user:', error);
            setIsLoadingUser(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAuthLoading(true);
        setAuthError('');

        try {
            // Use Firebase Auth for login
            const userCredential = await signInWithEmailAndPassword(
                auth,
                authForm.email,
                authForm.password
            );

            const firebaseUser = userCredential.user;

            // Now fetch the client profile from Supabase using Firebase UID
            const { data: clientProfile, error } = await supabase
                .from('client_profiles')
                .select('*')
                .eq('firebase_uid', firebaseUser.uid)
                .single();

            if (error) {
                console.error('Error fetching client profile:', error);
                setAuthError('User profile not found');
                return;
            }

            console.log('+++++ Fetched client profile on login:', clientProfile);

            if (clientProfile) {
                // Split full_name into first and last name
                const fullName = clientProfile.full_name || '';
                const nameParts = fullName.split(' ');
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || '';

                // Set user state with the client profile
                setUser({
                    id: clientProfile.id,
                    email: clientProfile.email,
                    first_name: firstName,
                    last_name: lastName,
                    phone: clientProfile.phone,
                    points: clientProfile.points,
                    address: clientProfile.address,
                    city: clientProfile.city,
                    zip_code: clientProfile.zip_code
                });

                // Update form data
                setFormData(prev => ({
                    ...prev,
                    firstName: firstName,
                    lastName: lastName,
                    email: clientProfile.email || '',
                    phone: clientProfile.phone || '',
                    address: clientProfile.address || '',
                    city: clientProfile.city || '',
                    zipCode: clientProfile.zip_code || ''
                }));

                console.log('@@@@@@ User logged in and form updated');
                setShowAuthModal(false);
                setAuthForm({ email: '', password: '', firstName: '', lastName: '', phone: '' });
            }

        } catch (error: any) {
            console.error('Login error:', error);
            setAuthError(error.message || 'Login failed');
        } finally {
            setIsAuthLoading(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAuthLoading(true);
        setAuthError('');

        try {
            // Create user with Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                authForm.email,
                authForm.password
            );

            const firebaseUser = userCredential.user;

            // Combine first and last name into full_name for Supabase
            const fullName = `${authForm.firstName} ${authForm.lastName}`.trim();

            // Create client profile in Supabase
            const { data: clientProfile, error: profileError } = await supabase
                .from('client_profiles')
                .insert({
                    firebase_uid: firebaseUser.uid,
                    email: authForm.email,
                    full_name: fullName,
                    phone: authForm.phone,
                    points: 0,
                    created_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (profileError) throw profileError;

            if (clientProfile) {
                // Set user state
                setUser({
                    id: clientProfile.id,
                    email: clientProfile.email,
                    first_name: authForm.firstName,
                    last_name: authForm.lastName,
                    phone: clientProfile.phone,
                    points: clientProfile.points
                });

                setShowAuthModal(false);
                setAuthForm({ email: '', password: '', firstName: '', lastName: '', phone: '' });
            }

        } catch (error: any) {
            console.error('Signup error:', error);
            setAuthError(error.message || 'Signup failed');
        } finally {
            setIsAuthLoading(false);
        }
    };

    const handleLogout = async () => {
        await auth.signOut();
        setUser(null);
        setFormData(prev => ({
            ...prev,
            firstName: "",
            lastName: "",
            email: "",
            phone: ""
        }));
    };

    // Add this function to handle points after successful card payment
useEffect(() => {
    const processPendingPoints = async () => {
        try {
            const pendingPoints = sessionStorage.getItem('pendingPointsOrder');
            if (pendingPoints) {
                const { userId, orderId, pointsEarned } = JSON.parse(pendingPoints);
                
                console.log('🔄 Processing pending points:', { userId, orderId, pointsEarned });

                // If user is logged in and matches the stored userId
                if (user && userId === user.id) {
                    await addPointsTransaction(
                        orderId,
                        pointsEarned,
                        'earn',
                        `Points earned for order #${orderId}`
                    );
                    
                    console.log('✅ Points processed successfully');
                    sessionStorage.removeItem('pendingPointsOrder');
                    
                    // Show success message to user
                    alert(`🎉 You earned ${pointsEarned} points for your order!`);
                } else if (!user) {
                    console.log('👤 No user logged in, keeping points pending');
                    // Keep points pending until user logs in
                }
            }
        } catch (error) {
            console.error('💥 Error processing pending points:', error);
        }
    };

    processPendingPoints();
}, [user]); // Only depend on user changes

    // Points System Functions
    const addPointsTransaction = async (orderId: string, points: number, type: 'earn' | 'redeem' | 'adjustment', description: string) => {
        if (!user) {
            console.log('No user found, skipping points transaction');
            return;
        }

        try {
            console.log('➕ Adding points transaction for order:', orderId);
            console.log('👤 User:', user.id, 'Points:', points, 'Type:', type);

            // 1. Add to pointshistory
            const pointsHistoryData: any = {
                user_id: user.id,
                order_id: orderId,
                points: points,
                description: `${type}: ${description}`,
                created_at: new Date().toISOString(),
            };

            const { error: pointsError } = await supabase
                .from('points_history')
                .insert(pointsHistoryData);



            console.log('💾 Points history entry:', pointsHistoryData);

            
            if (pointsError) {
                console.error('📝 Points history error (non-critical):', pointsError);
                // Continue anyway - don't block for points history issues
            } else {
                console.log('✅ Points history recorded');
            }

            // 2. Get current points balance from user_points table
            const { data: currentPoints, error: fetchError } = await supabase
                .from('user_points')
                .select('points')
                .eq('user_id', user.id)
                .single();

            let newBalance = points;

            if (!fetchError && currentPoints) {
                // Add to existing balance
                newBalance = (currentPoints.points || 0) + points;
            }

            console.log('💳 Balance update:', {
                current: currentPoints?.points || 0,
                change: `+${points}`,
                new: newBalance
            });

            // 3. Update user_points balance with upsert
            const { error: upsertError } = await supabase
                .from('user_points')
                .upsert({
                    user_id: user.id,
                    points: newBalance,
                    updated_at: new Date().toISOString(),
                    ...(!currentPoints && { created_at: new Date().toISOString() }) // Only set created_at for new records
                }, {
                    onConflict: 'user_id'
                });

            if (upsertError) {
                console.error('❌ Error updating user_points:', upsertError);
                throw upsertError;
            }

            console.log('✅ User points balance updated');

            // 4. Also update client_profiles.total_points for consistency
            await supabase
                .from('client_profiles')
                .update({
                    total_points: newBalance,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            console.log('✅ Client profile points updated');

            // 5. Update local user state
            setUser(prev => prev ? { ...prev, points: newBalance } : null);

            console.log('🎉 Points transaction completed successfully');

        } catch (error) {
            console.error('💥 Error in points transaction:', error);
            // Don't throw the error - points shouldn't block the order
        }
    };

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handlePaymentMethodChange = (method: string) => {
        setFormData((prev) => ({
            ...prev,
            paymentMethod: method,
        }));
    };


    const validateCustomerInfo = (): boolean => {
        const requiredFields = {
            firstName: t('common.firstName'),
            lastName: t('common.lastName'),
            email: t('common.email'),
            phone: t('common.phone'),
            address: t('common.address'),
            city: t('common.city'),
            zipCode: t('common.zipCode')
        };

        const missingFields = Object.entries(requiredFields)
            .filter(([key]) => !formData[key as keyof FormData]?.trim())
            .map(([_, label]) => label);

        if (missingFields.length > 0) {
            alert(`${t('checkoutPage.requiredFields')}\n${missingFields.join("\n")}`);
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            alert(t('checkoutPage.validEmail'));
            return false;
        }

        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        const cleanPhone = formData.phone.replace(/\D/g, '');
        if (!phoneRegex.test(cleanPhone)) {
            alert(t('checkoutPage.validPhone'));
            return false;
        }

        return true;
    };

    const handleContinueToReview = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateCustomerInfo()) {
            setCurrentStep("review");
        }
    };

    const handleBackToInfo = () => {
        setCurrentStep("info");
    };

    const handlePlaceOrder = async () => {
        if (formData.paymentMethod === "cash") {
            await handleCashPayment();
        } else {
            await handleCardPayment();
        }
    };

    const collectValidImageUrls = (item: CartItem): string[] => {
        const validUrls: string[] = [];

        const addIfValidUrl = (url: any): boolean => {
            if (typeof url !== 'string') return false;

            const trimmedUrl = url.trim();
            if (!trimmedUrl) return false;

            try {
                new URL(trimmedUrl);
                const isImage = /\.(jpg|jpeg|png|webp|gif|bmp|svg)(\?.*)?$/i.test(trimmedUrl) ||
                    trimmedUrl.includes('cloudinary') ||
                    trimmedUrl.includes('firebase') ||
                    trimmedUrl.includes('storage.googleapis.com');

                if (isImage && !validUrls.includes(trimmedUrl)) {
                    validUrls.push(trimmedUrl);
                    return true;
                }
            } catch (error) {
                console.warn(`Invalid image URL for ${item.name}:`, trimmedUrl);
            }
            return false;
        };

        const imageFields = [
            item.image,
            item.imageUrl,
            item.thumbnail,
            item.mainImage,
            item.photo,
            item.img,
            item.picture
        ];

        imageFields.forEach(field => addIfValidUrl(field));

        if (Array.isArray(item.images)) {
            item.images.forEach((url: string) => addIfValidUrl(url));
        }
        if (Array.isArray(item.imageUrls)) {
            item.imageUrls.forEach((url: string) => addIfValidUrl(url));
        }

        return validUrls;
    };

    const handleCardPayment = async () => {
        setIsProcessing(true);

        try {
            if (!safeCart || safeCart.length === 0) {
                throw new Error('Your cart is empty. Please add items before proceeding.');
            }

            const cartItems = safeCart.map((item, index) => {
                if (!item.name || item.name.trim() === "") {
                    throw new Error(`Item ${index + 1} is missing a name`);
                }

                if (item.price === undefined || item.price === null) {
                    throw new Error(`Item "${item.name}" is missing price information`);
                }

                if (typeof item.price !== "number" || item.price < 0) {
                    throw new Error(`Item "${item.name}" has an invalid price`);
                }

                if (item.quantity && (item.quantity < 1 || !Number.isInteger(item.quantity))) {
                    throw new Error(`Item "${item.name}" has an invalid quantity`);
                }

                const validImageUrls = collectValidImageUrls(item);

                const cartItem: any = {
                    productId: item.id || `item-${index}-${Date.now()}`,
                    name: item.name.trim(),
                    price: Number(item.price),
                    quantity: item.quantity || 1,
                    ...(item.description && {
                        description: item.description.substring(0, 495)
                    }),
                    ...(item.category && { category: item.category }),
                };

                if (validImageUrls.length > 0) {
                    cartItem.image = validImageUrls[0];
                    cartItem.imageUrls = validImageUrls.slice(0, 8);
                }

                return cartItem;
            });

            const customerInfo: CustomerInfo = {
                name: `${formData.firstName} ${formData.lastName}`.trim(),
                email: formData.email.trim(),
                phone: formData.phone?.trim() || "",
                address: formData.address?.trim() || "",
                city: formData.city?.trim() || "",
                zipCode: formData.zipCode?.trim() || "",
                deliveryInstructions: formData.deliveryInstructions?.trim() || "",
                province: "QC",
            };

            // Update user profile with address info if logged in
            if (user) {
                console.log('Attempting to update user profile before payment...');
                const updateSuccess = await updateUserProfile(customerInfo);
                if (!updateSuccess) {
                    console.warn('Profile update failed, but continuing with payment...');
                }
            }


            const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            if (subtotal <= 0) {
                throw new Error('Invalid cart total. Please check your items.');
            }

            const gst = Number((subtotal * 0.05).toFixed(2));
            const qst = Number((subtotal * 0.09975).toFixed(2));
            const tax = gst + qst;
            const deliveryFee = subtotal > 25 ? 0 : 4.99;
            const finalTotal = Number((subtotal + tax + deliveryFee).toFixed(2));

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            const requestBody: any = {
                cartItems,
                customerInfo,
                totals: {
                    subtotal: subtotal,
                    gst: gst,
                    qst: qst,
                    deliveryFee: deliveryFee,
                    finalTotal: finalTotal
                },
                userId: user?.id || 'guest-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                clientUrl: window.location.origin
            };

            // Add points information if user is logged in
            if (user) {
                requestBody.pointsInfo = {
                    userId: user.id,
                    pointsEarned: pointsEarned,
                    currentBalance: user.points
                };
            }

            const response = await fetch('https://us-central1-sushi-admin.cloudfunctions.net/createCheckoutHTTP', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                let errorData;
                const responseText = await response.text();

                try {
                    errorData = JSON.parse(responseText);
                } catch {
                    errorData = { error: `Server error: ${response.status}` };
                }

                switch (response.status) {
                    case 400:
                        throw new Error(errorData.details || errorData.error || 'Invalid request. Please check your cart.');
                    case 500:
                        throw new Error('Payment service is temporarily unavailable. Please try again.');
                    default:
                        throw new Error(errorData.error || `Payment failed: ${response.status}`);
                }
            }

            const result = await response.json();

            if (result.success && result.url) {
                // Store order info for points processing after payment
                if (user) {
                    sessionStorage.setItem('pendingPointsOrder', JSON.stringify({
                        userId: user.id,
                        orderId: result.orderId || `order-${Date.now()}`,
                        pointsEarned: pointsEarned,
                        cartTotal: cartTotal
                    }));
                }

                if (typeof gtag !== 'undefined') {
                    gtag('event', 'begin_checkout', {
                        currency: 'CAD',
                        value: finalTotal,
                        items: cartItems.map(item => ({
                            item_id: item.productId,
                            item_name: item.name,
                            price: item.price,
                            quantity: item.quantity
                        }))
                    });
                }

                sessionStorage.setItem('pendingCheckout', JSON.stringify({
                    cartItems,
                    customerInfo,
                    totals: { subtotal, gst, qst, deliveryFee, finalTotal },
                    timestamp: Date.now()
                }));

                window.location.href = result.url;
            } else {
                throw new Error(result.error || 'Checkout session creation failed');
            }

        } catch (error: any) {
            console.error('💥 Card payment error:', error);

            let userMessage = error.message || 'Payment processing failed. Please try again.';

            if (error.name === 'AbortError') {
                userMessage = 'Request timeout. Please check your connection and try again.';
            }

            if (error.message.includes('network') || error.message.includes('fetch')) {
                userMessage = 'Network error. Please check your internet connection and try again.';
            }

            alert(userMessage);
            setIsProcessing(false);
        }
    };

    // Update the updateUserProfile function with better error handling
    const updateUserProfile = async (customerInfo: CustomerInfo): Promise<boolean> => {
        if (!user) {
            console.log('No user found, skipping profile update');
            return false;
        }

        try {
            const fullName = `${formData.firstName} ${formData.lastName}`.trim();

            console.log('Updating user profile with:', {
                userId: user.id,
                fullName,
                email: formData.email,
                phone: formData.phone,
                address: customerInfo.address,
                city: customerInfo.city,
                zipCode: customerInfo.zipCode
            });

            const { error } = await supabase
                .from('client_profiles')
                .update({
                    full_name: fullName,
                    email: formData.email,
                    phone: formData.phone,
                    address: customerInfo.address,
                    city: customerInfo.city,
                    zip_code: customerInfo.zipCode,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);

            if (error) {
                console.error('Supabase update error:', error);
                throw error;
            }

            // Also update local user state with the new data
            setUser(prev => prev ? {
                ...prev,
                first_name: formData.firstName,
                last_name: formData.lastName,
                email: formData.email,
                phone: formData.phone,
                address: customerInfo.address,
                city: customerInfo.city,
                zip_code: customerInfo.zipCode
            } : null);

            console.log('User profile updated successfully');
            return true;

        } catch (error) {
            console.error('Error updating user profile:', error);
            alert('Failed to update your profile information. Please try again.');
            return false;
        }
    };

    const handleCashPayment = async () => {
        setIsProcessing(true);
        try {
            const functions = getFunctions();
            const createCashOrder = httpsCallable<
                {
                    cartItems: any[];
                    customerInfo: any;
                    totals: any;
                    pointsInfo?: any;
                },
                CashOrderResponse
            >(functions, "createCashOrder");

            const cartItems = safeCart.map((item, index) => {
                const validImageUrls = collectValidImageUrls(item);

                return {
                    productId: item.id || `item-${index}-${Date.now()}`,
                    name: item.name,
                    sellingPrice: item.price,
                    quantity: item.quantity || 1,
                    ...(item.description && { description: item.description }),
                    ...(item.category && { category: item.category }),
                    ...(validImageUrls.length > 0 && {
                        image: validImageUrls[0],
                        images: validImageUrls
                    }),
                };
            });

            const customerInfo: CustomerInfo = {
                name: `${formData.firstName} ${formData.lastName}`,
                email: formData.email,
                phone: formData.phone,
                address: formData.address,
                city: formData.city,
                zipCode: formData.zipCode,
                deliveryInstructions: formData.deliveryInstructions,
                province: "QC",
            };

            // Update user profile with address info if logged in
            if (user) {
                await updateUserProfile(customerInfo);
            }

            const totals: Totals = {
                subtotal: cartTotal,
                gst,
                qst,
                deliveryFee,
                finalTotal,
            };

            const requestData: any = {
                cartItems,
                customerInfo,
                totals,
            };

            // Add points information if user is logged in
            if (user) {
                requestData.pointsInfo = {
                    userId: user.id,
                    pointsEarned: pointsEarned,
                    currentBalance: user.points
                };
            }

            const result: HttpsCallableResult<CashOrderResponse> =
                await createCashOrder(requestData);

            if (result.data.success) {
                setOrderNumber(result.data.orderId);
                setOrderComplete(true);
                clearCart();

                // Add points for cash order
                if (user) {
                    await addPointsTransaction(
                        result.data.orderId,
                        pointsEarned,
                        'earn',
                        `Points earned for order ${result.data.orderId}`
                    );
                }

                sessionStorage.removeItem('pendingCheckout');
            } else {
                throw new Error(result.data.error || "Order creation failed");
            }
        } catch (error: any) {
            console.error("Cash order error:", error);
            alert(error.message || "Failed to create order. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    // Add this function to handle points after successful card payment
    useEffect(() => {
        const processPendingPoints = async () => {
            const pendingPoints = sessionStorage.getItem('pendingPointsOrder');
            if (pendingPoints && user) {
                const { userId, orderId, pointsEarned } = JSON.parse(pendingPoints);

                if (userId === user.id) {
                    await addPointsTransaction(
                        orderId,
                        pointsEarned,
                        'earn',
                        `Points earned for order #${orderId}`
                    );
                    sessionStorage.removeItem('pendingPointsOrder');
                }
            }
        };

        if (user) {
            processPendingPoints();
        }
    }, [user]);

    if (safeCart.length === 0 && !orderComplete) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="container mx-auto px-6 text-center">
                    <div className="max-w-md mx-auto">
                        <svg
                            className="w-16 h-16 text-white/30 mx-auto mb-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1}
                                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                        </svg>
                        <h2 className="text-2xl font-light text-white mb-3 tracking-wide">
                            {t('checkoutPage.emptyCart')}
                        </h2>
                        <p className="text-white/60 mb-6 font-light tracking-wide text-sm">
                            {t('checkoutPage.emptyCartDescription')}
                        </p>
                        <Link
                            to="/order"
                            className="border border-white text-white px-6 py-3 rounded-sm hover:bg-white hover:text-gray-900 transition-all duration-300 font-light tracking-wide text-sm inline-block"
                        >
                            {t('checkoutPage.browseMenu')}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (orderComplete) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="container mx-auto px-6">
                    <div className="max-w-md mx-auto text-center">
                        <div className="bg-white/5 border border-white/10 rounded-sm p-8 backdrop-blur-sm">
                            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20">
                                <svg
                                    className="w-6 h-6 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.5}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-light text-white mb-3 tracking-wide">
                                {formData.paymentMethod === "cash"
                                    ? t('checkoutPage.orderConfirmed')
                                    : t('checkoutPage.paymentSuccessful')}
                            </h2>
                            <p className="text-white/60 mb-3 font-light tracking-wide text-sm">
                                {t('checkoutPage.thanksOrder')}
                            </p>

                            {/* Points Earned Display */}
                            {user && pointsEarned > 0 && (
                                <div className="bg-green-500/10 border border-green-500/20 rounded-sm p-4 mb-4">
                                    <p className="text-green-400 text-sm font-light">
                                        🎉 You earned <strong>{pointsEarned} points</strong>!
                                    </p>
                                    <p className="text-green-400/60 text-xs mt-1">
                                        New balance: {user.points + pointsEarned} points
                                    </p>
                                </div>
                            )}

                            <div className="bg-white/5 rounded-sm p-4 mb-6 border border-white/10">
                                <p className="text-xs text-white/40 font-light tracking-wide mb-1">
                                    {t('checkoutPage.orderNumber')}
                                </p>
                                <p className="text-lg font-light text-white font-mono">
                                    {orderNumber}
                                </p>
                            </div>
                            <p className="text-white/60 mb-6 font-light tracking-wide leading-relaxed text-sm">
                                {formData.paymentMethod === "cash"
                                    ? t('checkoutPage.cashPaymentMessage', { amount: finalTotal.toFixed(2) })
                                    : t('checkoutPage.cardPaymentMessage', { email: formData.email })}
                            </p>
                            <div className="flex flex-col gap-3">
                                <Link
                                    to="/order"
                                    className="border border-white text-white px-4 py-3 rounded-sm hover:bg-white hover:text-gray-900 transition-all duration-300 font-light tracking-wide text-sm"
                                >
                                    {t('checkoutPage.orderAgain')}
                                </Link>
                                <button
                                    onClick={() => navigate("/")}
                                    className="bg-white/5 border border-white/10 text-white px-4 py-3 rounded-sm hover:bg-white/10 transition-all duration-300 font-light tracking-wide text-sm"
                                >
                                    {t('checkoutPage.backHome')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const StepIndicator = () => (
        <div className="flex items-center justify-center mb-8">
            <div className="flex items-center">
                <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${currentStep === "info"
                        ? "bg-white border-white text-gray-900"
                        : "bg-white/10 border-white/20 text-white"
                        }`}>
                        <span className="text-sm font-light">1</span>
                    </div>
                    <span className={`text-xs mt-2 font-light tracking-wide ${currentStep === "info" ? "text-white" : "text-white/40"
                        }`}>
                        {t('checkoutPage.information')}
                    </span>
                </div>

                <div className="w-12 h-px bg-white/20 mx-2"></div>

                <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${currentStep === "review"
                        ? "bg-white border-white text-gray-900"
                        : currentStep === "payment"
                            ? "bg-white/10 border-white/20 text-white"
                            : "bg-white/5 border-white/10 text-white/40"
                        }`}>
                        <span className="text-sm font-light">2</span>
                    </div>
                    <span className={`text-xs mt-2 font-light tracking-wide ${currentStep === "review" || currentStep === "payment"
                        ? "text-white"
                        : "text-white/40"
                        }`}>
                        {t('checkoutPage.reviewPay')}
                    </span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-900">
            {showAuthModal && (
                <AuthModal
                    isLoginMode={isLoginMode}
                    setIsLoginMode={setIsLoginMode}
                    authForm={authForm}
                    setAuthForm={setAuthForm}
                    handleLogin={handleLogin}
                    handleSignup={handleSignup}
                    isAuthLoading={isAuthLoading}
                    authError={authError}
                    setAuthError={setAuthError}
                    setShowAuthModal={setShowAuthModal}
                />
            )}


            <div className="container mx-auto px-4 py-8">
                <div className="max-w-7xl mx-auto">
                    <header className="mb-8">
                        <Link
                            to="/order"
                            className="inline-flex items-center text-white/60 hover:text-white transition-colors duration-300 mb-3 font-light tracking-wide text-sm"
                        >
                            <svg
                                className="w-4 h-4 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M15 19l-7-7 7-7"
                                />
                            </svg>
                            {t('checkoutPage.backMenu')}
                        </Link>

                        {/* User Auth Status */}
                        <div className="flex justify-between items-center mb-4">
                            <h1 className="text-2xl font-light text-white tracking-wide">
                                {t('checkoutPage.checkout')}
                            </h1>

                            {isLoadingUser ? (
                                <div className="text-white/40 text-sm">Loading...</div>
                            ) : user ? (
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-white text-sm">Hello, {user.first_name}</p>
                                        <p className="text-white/60 text-xs">
                                            {user.points} points
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="text-white/60 hover:text-white text-sm border border-white/20 px-3 py-1 rounded-sm"
                                        type="button"
                                    >
                                        Logout
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowAuthModal(true)}
                                    className="text-white/60 hover:text-white text-sm border border-white/20 px-3 py-1 rounded-sm"
                                    type="button"
                                >
                                    Sign In / Sign Up
                                </button>
                            )}
                        </div>

                        {/* Points Info Banner */}
                        {user && (
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-sm p-3 mb-4">
                                <p className="text-blue-400 text-sm text-center">
                                    🎉 You'll earn <strong>{pointsEarned} points</strong> with this order!
                                </p>
                            </div>
                        )}

                        <StepIndicator />
                    </header>

                    {/* MAIN FORM - AuthModal is now completely outside this */}
                    <form onSubmit={currentStep === "info" ? handleContinueToReview : undefined}>
                        <div className="block lg:hidden space-y-6">
                            {currentStep === "info" && (
                                <>
                                    <CustomerInformation
                                        formData={formData}
                                        onInputChange={handleInputChange}
                                    />

                                    <OrderSummary
                                        cart={safeCart}
                                        cartTotal={cartTotal}
                                        itemCount={itemCount}
                                        gst={gst}
                                        qst={qst}
                                        deliveryFee={deliveryFee}
                                        finalTotal={finalTotal}
                                    />

                                    <div className="sticky bottom-0 bg-gray-900 border-t border-white/10 pt-4 pb-4 -mx-4 px-4 mt-6">
                                        <button
                                            type="submit"
                                            className="bg-white text-gray-900 px-8 py-4 rounded-sm hover:bg-white/90 transition-all duration-300 font-light tracking-wide text-sm w-full"
                                        >
                                            {t('checkoutPage.continueReview')}
                                        </button>
                                    </div>
                                </>
                            )}

                            {currentStep === "review" && (
                                <>
                                    <OrderSummary
                                        cart={safeCart}
                                        cartTotal={cartTotal}
                                        itemCount={itemCount}
                                        gst={gst}
                                        qst={qst}
                                        deliveryFee={deliveryFee}
                                        finalTotal={finalTotal}
                                    />

                                    <div className="bg-white/5 border border-white/10 rounded-sm p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-light text-white tracking-wide">
                                                {t('checkoutPage.deliveryInfo')}
                                            </h3>
                                            <button
                                                type="button"
                                                onClick={handleBackToInfo}
                                                className="text-white/60 hover:text-white text-sm font-light tracking-wide"
                                            >
                                                {t('checkoutPage.edit')}
                                            </button>
                                        </div>
                                        <div className="text-white/80 font-light text-sm space-y-2">
                                            <p>{formData.firstName} {formData.lastName}</p>
                                            <p>{formData.email}</p>
                                            <p>{formData.phone}</p>
                                            <p>{formData.address}, {formData.city}, QC {formData.zipCode}</p>
                                            {formData.deliveryInstructions && (
                                                <p className="text-white/60">{t('checkoutPage.instructions')}: {formData.deliveryInstructions}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="sticky bottom-0 bg-gray-900 border-t border-white/10 pt-4 pb-4 -mx-4 px-4">
                                        <PaymentMethodSelector
                                            paymentMethod={formData.paymentMethod}
                                            onPaymentMethodChange={handlePaymentMethodChange}
                                            finalTotal={finalTotal}
                                            isProcessing={isProcessing}
                                            onPlaceOrder={handlePlaceOrder}
                                            onBack={handleBackToInfo}
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="hidden lg:grid grid-cols-1 xl:grid-cols-4 gap-8">
                            <div className="xl:col-span-3 space-y-6">
                                {currentStep === "info" && (
                                    <>
                                        <CustomerInformation
                                            formData={formData}
                                            onInputChange={handleInputChange}
                                        />

                                        <div className="flex justify-end pt-4">
                                            <button
                                                type="submit"
                                                className="bg-white text-gray-900 px-8 py-3 rounded-sm hover:bg-white/90 transition-all duration-300 font-light tracking-wide text-sm"
                                            >
                                                {t('checkoutPage.continueReview')}
                                            </button>
                                        </div>
                                    </>
                                )}

                                {currentStep === "review" && (
                                    <>
                                        <div className="bg-white/5 border border-white/10 rounded-sm p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-lg font-light text-white tracking-wide">
                                                    {t('checkoutPage.deliveryInfo')}
                                                </h3>
                                                <button
                                                    type="button"
                                                    onClick={handleBackToInfo}
                                                    className="text-white/60 hover:text-white text-sm font-light tracking-wide"
                                                >
                                                    {t('checkoutPage.edit')}
                                                </button>
                                            </div>
                                            <div className="text-white/80 font-light text-sm space-y-2">
                                                <p>{formData.firstName} {formData.lastName}</p>
                                                <p>{formData.email}</p>
                                                <p>{formData.phone}</p>
                                                <p>{formData.address}, {formData.city}, QC {formData.zipCode}</p>
                                                {formData.deliveryInstructions && (
                                                    <p className="text-white/60">{t('checkoutPage.instructions')}: {formData.deliveryInstructions}</p>
                                                )}
                                            </div>
                                        </div>

                                        <PaymentMethodSelector
                                            paymentMethod={formData.paymentMethod}
                                            onPaymentMethodChange={handlePaymentMethodChange}
                                            finalTotal={finalTotal}
                                            isProcessing={isProcessing}
                                            onPlaceOrder={handlePlaceOrder}
                                            onBack={handleBackToInfo}
                                        />
                                    </>
                                )}
                            </div>

                            <div className="xl:col-span-1">
                                <div className="min-w-80">
                                    <OrderSummary
                                        cart={safeCart}
                                        cartTotal={cartTotal}
                                        itemCount={itemCount}
                                        gst={gst}
                                        qst={qst}
                                        deliveryFee={deliveryFee}
                                        finalTotal={finalTotal}
                                    />
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            <LandingCTAFooter displaySimple={true} />
        </div>
    )
}