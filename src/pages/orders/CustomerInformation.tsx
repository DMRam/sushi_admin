import { memo, useMemo, useRef, useCallback } from 'react'
import type { ChangeEvent } from 'react'

type DeliveryMethod = 'pickup' | 'delivery'

export interface CustomerFormData {
  firstName: string
  email: string
  phone: string
  deliveryMethod: DeliveryMethod
  address: string
  city: string
  area: string
  zipCode: string
  deliveryInstructions: string
}

interface Props {
  formData: CustomerFormData
  onInputChange: (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => void
  errors: Partial<Record<keyof CustomerFormData, string>>
  t: (key: string, defaultValue?: string) => string
}

const CITIES = [
  { value: 'Sherbrooke', label: 'Sherbrooke' },
  { value: 'Magog', label: 'Magog' },
  { value: 'Rock Forest', label: 'Rock Forest' },
  { value: 'Lennoxville', label: 'Lennoxville' },
  { value: 'Brompton', label: 'Brompton' },
  { value: 'Other', label: 'Other / Pickup Only' },
]

const SHERBROOKE_AREAS = [
  'Mont-Bellevue',
  'Fleurimont',
  'Rock Forest–Saint-Élie–Deauville',
  'Jacques-Cartier',
  'Brompton',
  'Lennoxville',
].sort()

const CustomerInformationComponent = ({
  formData,
  onInputChange,
  errors,
  t,
}: Props) => {
  const needsAddress = formData.deliveryMethod === 'delivery'
  const showArea = formData.city === 'Sherbrooke'
  const addressRef = useRef<HTMLInputElement>(null)

  console.log('Rendering CustomerInformation');

  // Memoize all static data and configurations
  const cityOptions = useMemo(() => CITIES, [])
  const sherbrookeAreas = useMemo(() => SHERBROOKE_AREAS, [])

  // Memoize form fields configuration
  const formFields = useMemo(() => [
    ['firstName', 'common.firstName', 'customerInformation.firstNamePlaceholder', 'Jean'],
    ['email', 'common.email', 'customerInformation.emailPlaceholder', 'jean@example.com'],
    ['phone', 'common.phone', 'customerInformation.phonePlaceholder', '(819) 555-1234'],
  ], [])

  // Memoize delivery method buttons configuration
  const deliveryMethodButtons = useMemo(() =>
    (['pickup', 'delivery'] as DeliveryMethod[]).map((method) => {
      const active = formData.deliveryMethod === method
      return {
        method,
        active,
        label: method === 'pickup' ? 'Pickup' : 'Delivery',
        className: [
          'px-6 py-3 text-sm border rounded-xl transition-all duration-300 font-light tracking-wide',
          active
            ? 'border-[#E62B2B] bg-[#E62B2B] text-white shadow-lg shadow-[#E62B2B]/30'
            : 'border-white/15 bg-white/5 text-white/80 hover:border-[#E62B2B]/40 hover:bg-white/10',
        ].join(' ')
      }
    }), [formData.deliveryMethod])

  // Optimized delivery method change handler
  const handleDeliveryMethodChange = useCallback((method: DeliveryMethod) => {
    const syntheticEvent = {
      target: {
        name: 'deliveryMethod',
        value: method
      }
    } as ChangeEvent<HTMLSelectElement>

    onInputChange(syntheticEvent)
  }, [onInputChange])

  // Remove localStorage effects - they cause unnecessary re-renders
  // Move persistence logic to parent component if needed

  // Memoize the address section conditionally
  const addressSection = useMemo(() => {
    if (!needsAddress) {
      return (
        <div className="mt-6 text-sm text-white/60 font-light bg-white/5 rounded-xl p-4 border border-white/10">
          📍 Pickup in Sherbrooke — we'll message you when it's ready.
        </div>
      )
    }

    return (
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 bg-white/5 rounded-2xl border border-white/10">
        {/* Address */}
        <div className="lg:col-span-2">
          <label className="block text-sm text-white/70 mb-2 font-light tracking-wide">
            {t('common.address', 'Delivery Address')}
          </label>
          <input
            ref={addressRef}
            name="address"
            value={formData.address}
            onChange={onInputChange}
            placeholder={t(
              'customerInformation.addressPlaceholder',
              '123 Rue King Ouest, Apt 4B'
            )}
            className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-white placeholder-white/30 font-light focus:outline-none focus:border-[#E62B2B] focus:bg-white/10 transition-all duration-300"
          />
          {errors.address && (
            <p className="mt-2 text-xs text-[#E62B2B] font-light">{errors.address}</p>
          )}
        </div>

        {/* City */}
        <div>
          <label className="block text-sm text-white/70 mb-2 font-light tracking-wide">
            {t('common.city', 'City')}
          </label>
          <select
            name="city"
            value={formData.city}
            onChange={onInputChange}
            className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-white font-light focus:outline-none focus:border-[#E62B2B] focus:bg-white/10 transition-all duration-300"
          >
            <option value="">{t('orderPage.home', 'Select city')}</option>
            {cityOptions.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          {errors.city && (
            <p className="mt-2 text-xs text-[#E62B2B] font-light">{errors.city}</p>
          )}
        </div>

        {/* Area (Cartier) */}
        <div>
          <label className="block text-sm text-white/70 mb-2 font-light tracking-wide">
            Area (Cartier)
          </label>
          <select
            name="area"
            value={formData.area}
            onChange={onInputChange}
            disabled={!showArea}
            className={[
              'w-full bg-white/5 border rounded-lg px-4 py-3 text-white font-light focus:outline-none focus:border-[#E62B2B] focus:bg-white/10 transition-all duration-300',
              showArea ? 'border-white/15' : 'border-white/5 opacity-60 cursor-not-allowed',
            ].join(' ')}
          >
            <option value="">
              {showArea ? 'Select area' : '—'}
            </option>
            {showArea &&
              sherbrookeAreas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
          </select>
          {errors.area && (
            <p className="mt-2 text-xs text-[#E62B2B] font-light">{errors.area}</p>
          )}
        </div>

        {/* ZIP */}
        <div>
          <label className="block text-sm text-white/70 mb-2 font-light tracking-wide">
            {t('common.zipCode', 'ZIP Code')}
          </label>
          <input
            name="zipCode"
            value={formData.zipCode}
            onChange={onInputChange}
            placeholder={t('customerInformation.zipCodePlaceholder', 'J1H 4A8')}
            className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-white placeholder-white/30 font-light focus:outline-none focus:border-[#E62B2B] focus:bg-white/10 transition-all duration-300"
          />
          {errors.zipCode && (
            <p className="mt-2 text-xs text-[#E62B2B] font-light">{errors.zipCode}</p>
          )}
        </div>

        {/* Delivery Instructions */}
        <div className="lg:col-span-2">
          <label className="block text-sm text-white/70 mb-2 font-light tracking-wide">
            {t('common.deliveryInstructions', 'Delivery Instructions')}
          </label>
          <textarea
            name="deliveryInstructions"
            value={formData.deliveryInstructions}
            onChange={onInputChange}
            placeholder={t(
              'customerInformation.instructionsPlaceholder',
              'Gate code, buzzer number, landmarks…'
            )}
            className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-white placeholder-white/30 min-h-[100px] resize-y font-light focus:outline-none focus:border-[#E62B2B] focus:bg-white/10 transition-all duration-300"
          />
        </div>
      </div>
    )
  }, [needsAddress, formData, onInputChange, errors, t, showArea, cityOptions, sherbrookeAreas])

  // Memoize the personal info section
  const personalInfoSection = useMemo(() => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {formFields.map(([name, labelKey, placeholderKey, def]) => (
        <div key={name}>
          <label className="block text-sm text-white/70 mb-2 font-light tracking-wide">
            {t(labelKey, def)}
          </label>
          <input
            name={name}
            value={formData[name as keyof CustomerFormData] as string}
            onChange={onInputChange}
            placeholder={t(placeholderKey, def)}
            className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-white placeholder-white/30 font-light focus:outline-none focus:border-[#E62B2B] focus:bg-white/10 transition-all duration-300"
          />
          {errors[name as keyof CustomerFormData] && (
            <p className="mt-2 text-xs text-[#E62B2B] font-light">
              {errors[name as keyof CustomerFormData]}
            </p>
          )}
        </div>
      ))}
    </div>
  ), [formFields, formData, onInputChange, errors, t])

  // Memoize delivery method section
  const deliveryMethodSection = useMemo(() => (
    <div className="mb-8">
      <p className="text-sm uppercase tracking-[0.2em] text-white/60 mb-4 font-light">
        {t('checkoutPage.information', 'Information')}
      </p>

      <div className="flex flex-wrap gap-3">
        {deliveryMethodButtons.map(({ method, label, className }) => (
          <button
            key={method}
            type="button"
            onClick={() => handleDeliveryMethodChange(method)}
            className={className}
          >
            {label}
          </button>
        ))}
      </div>

      {errors.deliveryMethod && (
        <p className="mt-3 text-xs text-[#E62B2B] font-light">
          {errors.deliveryMethod}
        </p>
      )}

      {formData.deliveryMethod === 'pickup' && (
        <p className="mt-4 text-sm text-white/60 font-light">
          ✅ {t('common.free', 'Free')} pickup at our Sherbrooke location.
        </p>
      )}
    </div>
  ), [deliveryMethodButtons, handleDeliveryMethodChange, errors.deliveryMethod, formData.deliveryMethod, t])

  return (
    <section className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
      {deliveryMethodSection}
      {personalInfoSection}
      {addressSection}
    </section>
  )
}

// Custom comparison function for memo
const arePropsEqual = (prevProps: Props, nextProps: Props) => {
  // Compare formData - only re-render if actual values changed
  const formDataChanged = Object.keys(prevProps.formData).some(key => {
    const k = key as keyof CustomerFormData
    return prevProps.formData[k] !== nextProps.formData[k]
  })

  // Compare errors - only re-render if errors changed
  const errorsChanged = JSON.stringify(prevProps.errors) !== JSON.stringify(nextProps.errors)

  // Compare translation function reference
  const tChanged = prevProps.t !== nextProps.t

  // Compare onInputChange reference
  const onInputChangeChanged = prevProps.onInputChange !== nextProps.onInputChange

  return !formDataChanged && !errorsChanged && !tChanged && !onInputChangeChanged
}

// Export memoized component with custom comparison
export default memo(CustomerInformationComponent, arePropsEqual)