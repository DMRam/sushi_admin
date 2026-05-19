import { memo, useMemo, useRef, useCallback, useState } from "react";
import type { ChangeEvent } from "react";

type DeliveryMethod = "pickup" | "delivery";

export interface CustomerFormData {
  firstName: string;
  email: string;
  phone: string;
  deliveryMethod: DeliveryMethod;
  address: string;
  city: string;
  area: string;
  zipCode: string;
  deliveryInstructions: string;
  pickupTime: string;
  orderNotes: string;
}

interface Props {
  formData: CustomerFormData;
  onInputChange: (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => void;
  errors: Partial<Record<keyof CustomerFormData, string>>;
  t: (key: string, defaultValue?: string) => string;
}

const CITIES = [
  { value: "Sherbrooke", label: "Sherbrooke" },
  { value: "Magog", label: "Magog" },
  { value: "Rock Forest", label: "Rock Forest" },
  { value: "Lennoxville", label: "Lennoxville" },
  { value: "Brompton", label: "Brompton" },
  { value: "Other", label: "Other / Pickup Only" },
];

const SHERBROOKE_AREAS = [
  "Mont-Bellevue",
  "Fleurimont",
  "Rock Forest–Saint-Élie–Deauville",
  "Jacques-Cartier",
  "Brompton",
  "Lennoxville",
].sort();

const PICKUP_TIME_OPTIONS = [
  { value: "asap", labelKey: "checkout.pickup.asap", defaultLabel: "As soon as possible" },
  { value: "15", labelKey: "checkout.pickup.in15", defaultLabel: "In about 15 minutes" },
  { value: "30", labelKey: "checkout.pickup.in30", defaultLabel: "In about 30 minutes" },
  { value: "45", labelKey: "checkout.pickup.in45", defaultLabel: "In about 45 minutes" },
  { value: "60", labelKey: "checkout.pickup.in60", defaultLabel: "In about 1 hour" },
  { value: "custom", labelKey: "checkout.pickup.custom", defaultLabel: "I will write a pickup time in the notes" },
];

const CustomerInformationComponent = ({
  formData,
  onInputChange,
  errors,
  t,
}: Props) => {
  const [clientProfile, _setClientProfile] = useState<any>(null);
  const needsAddress = formData.deliveryMethod === "delivery";
  const showArea = formData.city === "Sherbrooke";
  const addressRef = useRef<HTMLInputElement>(null);

  

  // Memoized lists
  const cityOptions = useMemo(() => CITIES, []);
  const sherbrookeAreas = useMemo(() => SHERBROOKE_AREAS, []);
  const pickupTimeOptions = useMemo(() => PICKUP_TIME_OPTIONS, []);

  // Form fields
  const formFields = useMemo(
    () => [
      [
        "firstName",
        "common.firstName",
        "customerInformation.firstNamePlaceholder",
        "Jean",
      ],
      ["email", "common.email", "customerInformation.emailPlaceholder", "jean@example.com"],
      ["phone", "common.phone", "customerInformation.phonePlaceholder", "(819) 555-1234"],
    ],
    []
  );

  // Delivery buttons
  const deliveryMethodButtons = useMemo(
    () =>
      (["pickup", "delivery"] as DeliveryMethod[]).map((method) => {
        const active = formData.deliveryMethod === method;
        const isDelivery = method === "delivery";

        return {
          method,
          active,
          disabled: isDelivery,
          label: isDelivery
            ? t("checkout.delivery.deliveryLargeOrdersOnly", "Delivery (large orders only)")
            : t("checkout.delivery.pickup", "Pickup"),
          className: [
            "px-6 py-3 text-sm border rounded-[4px] transition-all duration-300 font-light tracking-wide",
            isDelivery
              ? "border-white/10 bg-[#0e0e0e] text-white/30 cursor-not-allowed"
              : active
                ? "border-[#f26350] bg-[#f26350] text-white shadow-lg shadow-[#f26350]/30"
                : "border-white/15 bg-[#0e0e0e] text-white/80 hover:border-[#f26350]/40 hover:bg-white/8",
          ].join(" "),
        };
      }),
    [formData.deliveryMethod, t]
  );

  // Delivery method handler
  const handleDeliveryMethodChange = useCallback(
    (method: DeliveryMethod) => {
      const syntheticEvent = {
        target: {
          name: "deliveryMethod",
          value: method,
        },
      } as ChangeEvent<HTMLSelectElement>;

      onInputChange(syntheticEvent);
    },
    [onInputChange]
  );

  // Pickup section
  const pickupSection = useMemo(
    () => (
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 bg-[#0e0e0e] rounded-[4px] border border-white/10">
        <div>
          <label className="block text-sm text-white/70 mb-2 font-light tracking-wide">
            {t("checkout.pickup.pickupTime", "Pickup time")}
          </label>

          <select
            name="pickupTime"
            value={formData.pickupTime || "asap"}
            onChange={onInputChange}
            className="w-full bg-[#0e0e0e] border border-white/15 rounded-[3px] px-4 py-3 text-white font-light focus:outline-none focus:border-[#f26350] focus:bg-[#151515] transition-all duration-300"
          >
            {pickupTimeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey, option.defaultLabel)}
              </option>
            ))}
          </select>

          {errors.pickupTime && (
            <p className="mt-2 text-xs text-[#f26350] font-light">
              {errors.pickupTime}
            </p>
          )}
        </div>

        <div className="lg:col-span-2">
          <label className="block text-sm text-white/70 mb-2 font-light tracking-wide">
            {t("checkout.pickup.orderNotes", "Order notes")}
          </label>

          <textarea
            name="orderNotes"
            value={formData.orderNotes || ""}
            onChange={onInputChange}
            placeholder={t(
              "checkout.pickup.orderNotesPlaceholder",
              "Example: I will pick it up at 6:30 PM, no sesame, extra soy sauce..."
            )}
            className="w-full bg-[#0e0e0e] border border-white/15 rounded-[3px] px-4 py-3 text-white placeholder-white/30 min-h-[90px] resize-y font-light focus:outline-none focus:border-[#f26350] focus:bg-[#151515] transition-all duration-300"
          />

          {errors.orderNotes && (
            <p className="mt-2 text-xs text-[#f26350] font-light">
              {errors.orderNotes}
            </p>
          )}
        </div>

        <div className="lg:col-span-2 text-sm text-white/60 font-light bg-black/10 rounded-[4px] p-4 border border-white/10">
          📍{" "}
          {t(
            "checkout.pickup.pickupMessage",
            "Pickup at our Sherbrooke location. We will prepare your order based on your selected time and contact you if needed."
          )}
        </div>
      </div>
    ),
    [formData.pickupTime, formData.orderNotes, onInputChange, errors.pickupTime, errors.orderNotes, t, pickupTimeOptions]
  );

  // Address section
  const addressSection = useMemo(() => {
    if (!needsAddress) {
      return pickupSection;
    }

    return (
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 bg-[#0e0e0e] rounded-[4px] border border-white/10">
        {/* Address */}
        <div className="lg:col-span-2">
          <label className="block text-sm text-white/70 mb-2 font-light tracking-wide">
            {t("common.address", "Delivery Address")}
          </label>
          <input
            ref={addressRef}
            name="address"
            value={formData.address}
            onChange={onInputChange}
            placeholder={t(
              "customerInformation.addressPlaceholder",
              "123 Rue King Ouest, Apt 4B"
            )}
            className="w-full bg-[#0e0e0e] border border-white/15 rounded-[3px] px-4 py-3 text-white placeholder-white/30 font-light focus:outline-none focus:border-[#f26350] focus:bg-[#151515] transition-all duration-300"
          />
          {errors.address && (
            <p className="mt-2 text-xs text-[#f26350] font-light">{errors.address}</p>
          )}
        </div>

        {/* City */}
        <div>
          <label className="block text-sm text-white/70 mb-2 font-light tracking-wide">
            {t("common.city", "City")}
          </label>
          <select
            name="city"
            value={formData.city}
            onChange={onInputChange}
            className="w-full bg-[#0e0e0e] border border-white/15 rounded-[3px] px-4 py-3 text-white font-light focus:outline-none focus:border-[#f26350] focus:bg-[#151515] transition-all duration-300"
          >
            <option value="">{t("orderPage.home", "Select city")}</option>
            {cityOptions.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          {errors.city && (
            <p className="mt-2 text-xs text-[#f26350] font-light">{errors.city}</p>
          )}
        </div>

        {/* Area */}
        <div>
          <label className="block text-sm text-white/70 mb-2 font-light tracking-wide">
            {t("common.area", "Area")}
          </label>
          <select
            name="area"
            value={formData.area}
            onChange={onInputChange}
            disabled={!showArea}
            className={[
              "w-full bg-[#0e0e0e] border rounded-[3px] px-4 py-3 text-white font-light focus:outline-none focus:border-[#f26350] focus:bg-[#151515] transition-all duration-300",
              showArea
                ? "border-white/15"
                : "border-white/5 opacity-60 cursor-not-allowed",
            ].join(" ")}
          >
            <option value="">{showArea ? t("common.selectArea", "Select area") : "—"}</option>
            {showArea &&
              sherbrookeAreas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
          </select>
          {errors.area && (
            <p className="mt-2 text-xs text-[#f26350] font-light">{errors.area}</p>
          )}
        </div>

        {/* ZIP */}
        <div>
          <label className="block text-sm text-white/70 mb-2 font-light tracking-wide">
            {t("common.zipCode", "ZIP Code")}
          </label>
          <input
            name="zipCode"
            value={formData.zipCode}
            onChange={onInputChange}
            placeholder={t(
              "customerInformation.zipCodePlaceholder",
              "J1H 1A2"
            )}
            className="w-full bg-[#0e0e0e] border border-white/15 rounded-[3px] px-4 py-3 text-white placeholder-white/30 font-light focus:outline-none focus:border-[#f26350] focus:bg-[#151515] transition-all duration-300"
          />
          {errors.zipCode && (
            <p className="mt-2 text-xs text-[#f26350] font-light">{errors.zipCode}</p>
          )}
        </div>

        {/* Delivery Instructions */}
        <div className="lg:col-span-2">
          <label className="block text-sm text-white/70 mb-2 font-light tracking-wide">
            {t("common.deliveryInstructions", "Delivery Instructions")}
          </label>
          <textarea
            name="deliveryInstructions"
            value={formData.deliveryInstructions}
            onChange={onInputChange}
            placeholder={t(
              "customerInformation.instructionsPlaceholder",
              "Gate code, buzzer number, landmarks…"
            )}
            className="w-full bg-[#0e0e0e] border border-white/15 rounded-[3px] px-4 py-3 text-white placeholder-white/30 min-h-[100px] resize-y font-light focus:outline-none focus:border-[#f26350] focus:bg-[#151515] transition-all duration-300"
          />
        </div>
      </div>
    );
  }, [
    needsAddress,
    pickupSection,
    formData,
    onInputChange,
    errors,
    t,
    showArea,
    cityOptions,
    sherbrookeAreas,
  ]);

  // Personal Info
  const personalInfoSection = useMemo(
    () => (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {formFields.map(([name, labelKey, placeholderKey, def]) => (
          <div key={name}>
            <label className="block text-sm text-white/70 mb-2 font-light tracking-wide">
              {t(labelKey, def)}
              {clientProfile && name === "email" && (
                <span className="ml-2 text-xs text-emerald-400 font-light">
                  {t("customerInformation.fromProfile", "(from your profile)")}
                </span>
              )}
            </label>
            <input
              name={name}
              value={formData[name as keyof CustomerFormData] as string}
              onChange={onInputChange}
              placeholder={t(placeholderKey, def)}
              className="w-full bg-[#0e0e0e] border border-white/15 rounded-[3px] px-4 py-3 text-white placeholder-white/30 font-light focus:outline-none focus:border-[#f26350] focus:bg-[#151515] transition-all duration-300"
              readOnly={name === "email" && !!clientProfile}
            />
            {errors[name as keyof CustomerFormData] && (
              <p className="mt-2 text-xs text-[#f26350] font-light">
                {errors[name as keyof CustomerFormData]}
              </p>
            )}
          </div>
        ))}
      </div>
    ),
    [formFields, formData, onInputChange, errors, t, clientProfile]
  );

  // Delivery method section
  const deliveryMethodSection = useMemo(
    () => (
      <div className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.22em] text-white/50 mb-4 font-bold">
          {t("checkoutPage.fulfillment", "Fulfillment")}
        </p>

        <div className="flex flex-wrap gap-3">
          {deliveryMethodButtons.map(({ method, label, className, disabled }) => (
            <button
              key={method}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                handleDeliveryMethodChange(method);
              }}
              className={className}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="mt-4 text-xs text-white/50 font-light">
          {t(
            "checkout.delivery.largeOrdersMessage",
            "Delivery is currently limited. Please contact us for large orders."
          )}
        </p>

        {errors.deliveryMethod && (
          <p className="mt-3 text-xs text-[#f26350] font-light">
            {errors.deliveryMethod}
          </p>
        )}

        {formData.deliveryMethod === "pickup" && (
          <p className="mt-4 border-l-2 border-[#f26350] pl-3 text-sm text-white/60 font-light">
            {t("checkout.pickup.freePickup", "Free pickup at our Sherbrooke location.")}
          </p>
        )}
      </div>
    ),
    [
      deliveryMethodButtons,
      handleDeliveryMethodChange,
      errors.deliveryMethod,
      formData.deliveryMethod,
      t,
    ]
  );

  return (
    <section className="bg-[#0b0b0b] backdrop-blur-md border border-white/10 p-5 shadow-2xl shadow-black/30 sm:p-8">
      <div className="mb-8 border-b border-white/10 pb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.26em] text-[#f26350]">
              {t("checkoutPage.customerDetails", "Customer details")}
            </p>

            <h2 className="mt-3 text-2xl font-light tracking-wide text-white md:text-3xl">
              {t("checkoutPage.pickupInformation", "Pickup information")}
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
              {t(
                "checkoutPage.customerDetailsDescription",
                "Add your contact details so the kitchen can confirm timing and reach you if anything needs attention."
              )}
            </p>
          </div>

          <div className="border border-[#f26350]/25 bg-[#f26350]/10 px-4 py-3 text-xs leading-5 text-white/70">
            <span className="font-bold uppercase tracking-[0.18em] text-[#ff8a78]">
              {t("checkoutPage.onlineDeal", "Online deal")}
            </span>
            <br />
            {t("checkoutPage.onlineDealDescription", "Use MAISUSHI10 before payment.")}
          </div>
        </div>
      </div>

      {/* Signed-in user indicator */}
      {clientProfile && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <p className="text-emerald-400 text-sm font-light">
              {t("customerInformation.signedInAs", "Signed in as")} {clientProfile.full_name}
            </p>
          </div>
        </div>
      )}

      {deliveryMethodSection}
      {personalInfoSection}
      {addressSection}
    </section>
  );
};

// Prevent unnecessary re-renders
const arePropsEqual = (prevProps: Props, nextProps: Props) => {
  const formDataChanged = Object.keys(prevProps.formData).some((key) => {
    const k = key as keyof CustomerFormData;
    return prevProps.formData[k] !== nextProps.formData[k];
  });

  const errorsChanged =
    JSON.stringify(prevProps.errors) !== JSON.stringify(nextProps.errors);

  const tChanged = prevProps.t !== nextProps.t;
  const onInputChangeChanged = prevProps.onInputChange !== nextProps.onInputChange;

  return !formDataChanged && !errorsChanged && !tChanged && !onInputChangeChanged;
};

export default memo(CustomerInformationComponent, arePropsEqual);
