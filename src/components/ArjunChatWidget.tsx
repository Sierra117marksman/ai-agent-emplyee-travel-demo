'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback
} from 'react';
import { TravelPackage } from '@/lib/packages';
import {
  X,
  Send,
  Sparkles,
  Bot,
  User,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Phone,
  Clock,
  Loader2
} from 'lucide-react';

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    contact?: string;
    email?: string;
  };
  theme?: {
    color?: string;
  };
  handler: (response: RazorpayResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayInstance {
  open: () => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  packages?: TravelPackage[];
}

export interface ArjunChatWidgetRef {
  sendMessage: (text: string) => void;
  selectPackage: (pkg: TravelPackage) => void;
}

interface ArjunChatWidgetProps {
  isOpen: boolean;
  onToggle: () => void;
}

const ArjunChatWidget = forwardRef<ArjunChatWidgetRef, ArjunChatWidgetProps>(function ArjunChatWidget(
  { isOpen, onToggle },
  ref
) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init',
      role: 'assistant',
      content:
        'Namaste! 🙏 Welcome to Wanderlust Journeys. I am Arjun, your senior travel concierge. Where are you thinking of traveling next, and what kind of trip are you dreaming of?',
      timestamp: 'Just now'
    }
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Lazy initialize leadId without synchronous setState in effect
  const [leadId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }
    return 'lead_initial';
  });

  // Customer contact details form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [showContactModal, setShowContactModal] = useState(false);
  const [activeBookingPackage, setActiveBookingPackage] = useState<TravelPackage | null>(null);

  // Payment state
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [confirmedPayment, setConfirmedPayment] = useState<{
    paymentId: string;
    orderId: string;
    packageName: string;
    customerName: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load Razorpay Checkout Script once on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !document.getElementById('razorpay-checkout-script')) {
      const script = document.createElement('script');
      script.id = 'razorpay-checkout-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, showContactModal, confirmedPayment]);

  const handleSendMessage = useCallback(
    async (textToSend?: string) => {
      const text = (textToSend || input).trim();
      if (!text || isLoading) return;

      setInput('');
      const userMsg: ChatMessage = {
        id: `usr-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: 'Just now'
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }))
          })
        });

        const data = await res.json();
        if (data.success) {
          const assistantMsg: ChatMessage = {
            id: `asst-${Date.now()}`,
            role: 'assistant',
            content: data.message,
            timestamp: 'Just now',
            packages:
              data.suggestedPackages && data.suggestedPackages.length > 0
                ? data.suggestedPackages
                : undefined
          };
          setMessages((prev) => [...prev, assistantMsg]);

          if (data.extractedLead?.customerName && !customerName) {
            setCustomerName(data.extractedLead.customerName);
          }
          if (data.extractedLead?.customerPhone && !customerPhone) {
            setCustomerPhone(data.extractedLead.customerPhone);
          }
          if (data.extractedLead?.customerEmail && !customerEmail) {
            setCustomerEmail(data.extractedLead.customerEmail);
          }

          if (leadId) {
            fetch('/api/leads', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: leadId,
                customerName: customerName || data.extractedLead?.customerName,
                customerPhone: customerPhone || data.extractedLead?.customerPhone,
                customerEmail: customerEmail || data.extractedLead?.customerEmail,
                destination: data.extractedLead?.destination,
                travelers: data.extractedLead?.travelers,
                budgetPerPerson: data.extractedLead?.budgetPerPerson,
                tripStyle: data.extractedLead?.tripStyle,
                status: 'QUALIFIED',
                chatTranscript: [...messages, userMsg, assistantMsg].map((m) => ({
                  role: m.role,
                  content: m.content,
                  timestamp: m.timestamp
                }))
              })
            }).catch(() => {});
          }
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content:
              'I apologize for the brief pause. Our advisors are standing by! You can select any package to proceed with your ₹2,000 booking token.',
            timestamp: 'Just now'
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages, customerName, customerPhone, customerEmail, leadId]
  );

  const startBookingFlow = (pkg: TravelPackage) => {
    setActiveBookingPackage(pkg);
    setShowContactModal(true);
  };

  const handleSelectPackageDirectly = (pkg: TravelPackage) => {
    setActiveBookingPackage(pkg);
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `Excellent choice! The **${pkg.title}** (${pkg.duration} at ₹${pkg.pricePerPerson.toLocaleString('en-IN')}/person) is one of our most coveted experiences. You can secure your reservation with a refundable ₹2,000 booking token. Would you like to proceed?`,
        timestamp: 'Just now',
        packages: [pkg]
      }
    ]);
  };

  // Expose imperative handle for clean event-driven communication without cascading effects
  useImperativeHandle(
    ref,
    () => ({
      sendMessage: (text: string) => {
        void handleSendMessage(text);
      },
      selectPackage: (pkg: TravelPackage) => {
        handleSelectPackageDirectly(pkg);
      }
    }),
    [handleSendMessage]
  );

  const handleInitiatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBookingPackage) return;

    if (!customerName || !customerPhone) {
      alert('Please enter your name and phone number so our travel advisor can contact you.');
      return;
    }

    setIsProcessingPayment(true);

    try {
      // 1. Create order on server (server enforces ₹2,000 amount!)
      const orderRes = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: activeBookingPackage.id,
          leadId,
          customerName,
          customerPhone,
          customerEmail
        })
      });

      const orderData = await orderRes.json();
      if (!orderData.success) {
        throw new Error(orderData.error || 'Failed to initialize payment');
      }

      setShowContactModal(false);

      // 2. Check if Razorpay SDK is loaded
      if (typeof window !== 'undefined' && window.Razorpay) {
        const options: RazorpayOptions = {
          key: orderData.keyId,
          amount: orderData.amount * 100, // 200,000 paise
          currency: 'INR',
          name: 'Wanderlust Journeys',
          description: `₹2,000 Booking Token • ${activeBookingPackage.title}`,
          order_id: orderData.orderId,
          prefill: {
            name: customerName,
            contact: customerPhone,
            email: customerEmail || 'guest@wanderlustjourneys.com'
          },
          theme: {
            color: '#0d9488'
          },
          handler: async (response: RazorpayResponse) => {
            // 3. Cryptographically verify signature on server!
            const verifyRes = await fetch('/api/razorpay/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                leadId: orderData.leadId
              })
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              setConfirmedPayment({
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                packageName: activeBookingPackage.title,
                customerName
              });
            } else {
              alert('Payment signature verification failed: ' + verifyData.error);
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        alert('Razorpay Checkout SDK is loading. Please try again in 2 seconds.');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unable to launch payment modal');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={onToggle}
          aria-label="Open chat with travel concierge Arjun Patel"
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2.5 sm:gap-3 px-3.5 py-2.5 sm:px-5 sm:py-3.5 rounded-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-2xl shadow-teal-500/40 hover:scale-105 active:scale-95 transition-all group"
        >
          <div className="relative">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-900 flex items-center justify-center border-2 border-white/40 shadow-inner">
              <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-teal-300" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-emerald-400 border-2 border-slate-950 rounded-full animate-pulse" />
          </div>

          <div className="text-left">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Arjun Patel</span>
              <span className="text-[9px] sm:text-[10px] font-normal px-1.5 py-0.2 rounded bg-teal-800/80 text-teal-200">
                Online
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-teal-100/90 font-medium hidden xs:block sm:block">Senior Travel Concierge</div>
          </div>
        </button>
      )}

      {/* Chat Drawer Window: Native Full-screen on mobile, Floating Drawer on desktop */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Chat with Arjun Patel"
          className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[440px] sm:h-[650px] sm:max-h-[90vh] z-50 bg-slate-950 border-0 sm:border border-slate-800 rounded-none sm:rounded-2xl shadow-2xl shadow-black/80 flex flex-col overflow-hidden text-slate-100 animate-in fade-in duration-200"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-emerald-950 px-4 sm:px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3.5 sm:py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-800 border-2 border-teal-500/50 flex items-center justify-center">
                  <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-teal-300" />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-slate-950 rounded-full" />
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>Arjun Patel</span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-1">
                  <span>Senior Travel Specialist</span>
                  <span>•</span>
                  <span className="text-teal-400 font-medium">Wanderlust</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onToggle}
              aria-label="Close chat window"
              className="w-9 h-9 sm:w-8 sm:h-8 rounded-xl bg-slate-800/90 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors active:scale-95 cursor-pointer"
            >
              <X className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* Sub-header safety banner */}
          <div className="bg-slate-900/90 px-4 py-2 border-b border-slate-850 flex items-center justify-between text-[11px] text-slate-300 shrink-0">
            <span className="flex items-center gap-1 text-teal-300 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" /> ₹2,000 Refundable Booking Token
            </span>
            <span className="text-slate-400">Razorpay Verified</span>
          </div>

          {/* Message Stream */}
          <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-4 bg-slate-950/60">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-teal-950 border border-teal-800 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-teal-400" />
                  </div>
                )}

                <div className="max-w-[88%] sm:max-w-[85%] space-y-3">
                  <div
                    className={`p-3 sm:p-3.5 rounded-2xl text-xs sm:text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-tr-none shadow-md'
                        : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                    }`}
                  >
                    <div className="whitespace-pre-line">{msg.content}</div>
                  </div>

                  {/* Render inline package recommendation cards if present */}
                  {msg.packages && msg.packages.length > 0 && (
                    <div className="space-y-2 pt-1">
                      {msg.packages.map((pkg) => (
                        <div
                          key={pkg.id}
                          className="bg-slate-900 border border-teal-800/60 rounded-xl p-3 shadow-lg hover:border-teal-600 transition-all text-xs"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <span className="font-bold text-white">{pkg.title}</span>
                            <span className="text-teal-300 font-bold shrink-0">
                              ₹{pkg.pricePerPerson.toLocaleString('en-IN')}/pax
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mb-2">
                            <Clock className="w-3 h-3 text-teal-400" />
                            <span>{pkg.duration}</span>
                            <span>•</span>
                            <span>{pkg.destination}</span>
                          </div>

                          <div className="text-[11px] text-slate-300 mb-3 line-clamp-2">
                            {pkg.highlights[0]}
                          </div>

                          <button
                            type="button"
                            onClick={() => startBookingFlow(pkg)}
                            className="w-full py-2.5 sm:py-2 px-3 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow hover:brightness-110 active:scale-98 transition-all cursor-pointer"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Pay ₹2,000 Booking Token</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-slate-300" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-slate-400 pl-9">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-400" />
                <span>Arjun is reviewing the itinerary catalog...</span>
              </div>
            )}

            {/* Post-Payment Verified Receipt Card */}
            {confirmedPayment && (
              <div className="bg-emerald-950/80 border-2 border-emerald-500/80 rounded-xl p-3.5 sm:p-4 shadow-xl text-xs text-slate-200 animate-in zoom-in-95">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-2">
                  <CheckCircle2 className="w-5 h-5 fill-emerald-400 text-slate-950" />
                  <span>Booking Token Verified ✓</span>
                </div>
                <p className="font-semibold text-white text-xs mb-3">
                  Booking token received — your travel advisor will contact you to finalize the itinerary.
                </p>
                <div className="bg-slate-900/90 rounded-lg p-2.5 space-y-1 font-mono text-[11px] border border-slate-800 mb-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Package:</span>
                    <span className="text-white font-sans font-bold">{confirmedPayment.packageName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Token Paid:</span>
                    <span className="text-emerald-400 font-bold">₹2,000 (INR)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Payment ID:</span>
                    <span className="text-slate-200">{confirmedPayment.paymentId}</span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-teal-400" />
                  <span>Arjun has dispatched your dossier to our senior booking desk.</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick-reply chip bar with horizontal touch scroll */}
          <div className="px-3 py-2 bg-slate-900/80 border-t border-slate-850 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs shrink-0">
            <button
              type="button"
              onClick={() => void handleSendMessage('Bali for honeymoon, budget around ₹45k per person')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 whitespace-nowrap active:scale-95 shrink-0"
            >
              🏝️ Bali Honeymoon
            </button>
            <button
              type="button"
              onClick={() => void handleSendMessage('Kashmir Valley for 2 people with houseboat stay')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 whitespace-nowrap active:scale-95 shrink-0"
            >
              🏔️ Kashmir Houseboat
            </button>
            <button
              type="button"
              onClick={() => void handleSendMessage('What packages do you have under ₹40,000?')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 whitespace-nowrap active:scale-95 shrink-0"
            >
              💰 Under ₹40k
            </button>
          </div>

          {/* Input Bar with iOS safe area padding */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSendMessage();
            }}
            className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Arjun (e.g., Bali for 2 under ₹50k)..."
              disabled={isLoading}
              className="flex-1 bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-base sm:text-xs text-white placeholder-slate-500 outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
              className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-40 text-white flex items-center justify-center transition-all shrink-0 active:scale-95 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Customer Contact & Razorpay Confirmation Modal */}
      {showContactModal && activeBookingPackage && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl text-slate-100 animate-in slide-in-from-bottom-5 sm:zoom-in-95 max-h-[92vh] overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">Step 1 of 2</span>
                <h3 className="text-lg font-bold text-white">Traveler Details for Booking</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                aria-label="Close modal"
                className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 mb-4 text-xs">
              <div className="text-slate-400">Selected Package:</div>
              <div className="font-bold text-white text-sm">{activeBookingPackage.title}</div>
              <div className="flex justify-between mt-1 text-slate-300">
                <span>Duration: {activeBookingPackage.duration}</span>
                <span className="text-teal-300 font-bold">
                  ₹{activeBookingPackage.pricePerPerson.toLocaleString('en-IN')}/pax
                </span>
              </div>
            </div>

            <form onSubmit={handleInitiatePayment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name <span className="text-teal-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Your Full Name"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-base sm:text-xs text-white placeholder-slate-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  WhatsApp / Mobile Number <span className="text-teal-400">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+91 10-digit mobile number"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-base sm:text-xs text-white placeholder-slate-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email Address (for Itinerary & Invoices)
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="yourname@example.com"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-base sm:text-xs text-white placeholder-slate-500 outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isProcessingPayment}
                  className="w-full py-3.5 sm:py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold text-sm shadow-lg shadow-teal-500/25 hover:brightness-110 active:scale-98 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isProcessingPayment ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Opening Razorpay Secure Gateway...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Pay ₹2,000 Booking Token</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-[11px] text-center text-slate-400 flex items-center justify-center gap-1.5 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                <span>100% Refundable Token • Secured by Razorpay 256-bit Encryption</span>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
});

export default ArjunChatWidget;
