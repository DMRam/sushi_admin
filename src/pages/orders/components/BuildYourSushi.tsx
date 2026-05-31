import { type WheelEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChefHat, RotateCcw, ShoppingCart, X } from 'lucide-react';
import { useIngredients } from '../../../context/IngredientsContext';
import { useCartStore } from '../../../stores/cartStore';
import type { MenuItem } from '../../../types/types';
import {
  byosCatalog,
  findByosCatalogItem,
  getEffectiveByosPrice,
  type ByosCategory,
} from '../../../utils/byosCatalog';

interface BuildYourSushiProps {
  isOpen: boolean;
  onClose: () => void;
}

type Option = {
  id: string;
  price: number;
  label?: string;
  maxPerRoll?: number;
  sortOrder?: number;
};

const maxFillingsPerRoll = 3;
const maxExtrasPerRoll = 2;

const bases: Option[] = [
  { id: 'classic', price: 8.95 },
  { id: 'riceOutside', price: 9.95 },
  { id: 'handRoll', price: 7.95 },
];

const normalizeByosLabel = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(avocat|palta)\b/g, 'avocado')
    .replace(/\b(saumon|salmon) fume\b/g, 'smoked salmon')
    .replace(/\bsaumon\b/g, 'salmon')
    .replace(/\bmassago\b/g, 'masago')
    .replace(/\b(fromage creme|cream cheese|queso crema|queso philadelphia)\b/g, 'philadelphia')
    .replace(/\b(ciboullet|ciboulette|chives)\b/g, 'chives')
    .replace(/\b(oignon vert|green onion|cebollin)\b/g, 'green onion')
    .replace(/\b(oignon frit|crispy onion|tempura flakes|frit)\b/g, 'crispy')
    .trim();

const getCatalogLabel = (
  labels: { fr: string; en: string; es: string },
  language: string,
) => {
  const locale = language.split('-')[0] as 'fr' | 'en' | 'es';
  return labels[locale] || labels.fr;
};

const getDefaultCatalogId = (category: ByosCategory) =>
  byosCatalog.find((item) => item.category === category)?.key || '';

const isSimpleByosExtra = (name: string) => {
  const normalized = normalizeByosLabel(name);
  const premiumTerms = [
    'lobster',
    'homard',
    'caviar',
    'truffle',
    'truffe',
    'uni',
    'wagyu',
    'foie',
    'scallop',
    'petoncle',
    'octopus',
    'pieuvre',
    'ikura',
  ];

  return !premiumTerms.some((term) => normalized.includes(term));
};

export default function BuildYourSushi({ isOpen, onClose }: BuildYourSushiProps) {
  const { t, i18n } = useTranslation();
  const { ingredients: dashboardIngredients } = useIngredients();
  const addToCart = useCartStore((state) => state.addToCart);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const [baseId, setBaseId] = useState(bases[0].id);
  const [proteinId, setProteinId] = useState(getDefaultCatalogId('protein'));
  const [sauceId, setSauceId] = useState(getDefaultCatalogId('sauce'));
  const [rolledOnId, setRolledOnId] = useState(getDefaultCatalogId('rolledOn'));
  const [selectedFillings, setSelectedFillings] = useState<string[]>(['cucumber']);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyWidth = document.body.style.width;
    const scrollY = window.scrollY;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.width = previousBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  const optionsByCategory = useMemo(() => {
    const grouped: Record<ByosCategory, Option[]> = {
      protein: [],
      filling: [],
      rolledOn: [],
      sauce: [],
      extra: [],
    };

    const optionByKey = new Map<string, Option>();

    byosCatalog.forEach((item) => {
      const option = {
        id: item.key,
        label: getCatalogLabel(item.labels, i18n.language),
        price: item.minPrice,
        maxPerRoll: item.maxPerRoll,
        sortOrder: item.sortOrder,
      };
      grouped[item.category].push(option);
      optionByKey.set(`${item.category}:${item.key}`, option);
    });

    dashboardIngredients
      .filter((ingredient) => ingredient.displayOnBYOS)
      .filter((ingredient) => ingredient.currentStock > 0)
      .filter((ingredient) => ingredient.byosCategory !== 'extra' || isSimpleByosExtra(ingredient.byosName || ingredient.name))
      .sort((a, b) => {
        const sortCompare = Number(a.byosSortOrder || 999) - Number(b.byosSortOrder || 999);
        if (sortCompare !== 0) return sortCompare;
        return (a.byosName || a.name).localeCompare(b.byosName || b.name);
      })
      .forEach((ingredient) => {
        const category = (ingredient.byosCategory || 'extra') as ByosCategory;
        const label = ingredient.byosName?.trim() || ingredient.name;
        const catalogItem = findByosCatalogItem(label, category);
        const effectivePrice = getEffectiveByosPrice(label, category, ingredient.byosPrice);

        if (catalogItem) {
          const existingOption = optionByKey.get(`${category}:${catalogItem.key}`);
          if (existingOption) {
            existingOption.price = Math.max(existingOption.price, effectivePrice);
            existingOption.maxPerRoll = Math.max(existingOption.maxPerRoll || 1, Number(ingredient.byosMaxPerRoll || 1));
            existingOption.sortOrder = Math.min(existingOption.sortOrder || catalogItem.sortOrder, Number(ingredient.byosSortOrder || catalogItem.sortOrder));
          }
          return;
        }

        grouped[category].push({
          id: `dashboard-${ingredient.id}`,
          label,
          price: effectivePrice,
          maxPerRoll: Math.max(1, Number(ingredient.byosMaxPerRoll || 1)),
          sortOrder: Number(ingredient.byosSortOrder || 999),
        });
      });

    Object.values(grouped).forEach((options) => {
      options.sort((a, b) => {
        const sortCompare = Number(a.sortOrder || 999) - Number(b.sortOrder || 999);
        if (sortCompare !== 0) return sortCompare;
        return String(a.label || a.id).localeCompare(String(b.label || b.id));
      });
    });

    return grouped;
  }, [dashboardIngredients, i18n.language]);

  const proteinOptions = optionsByCategory.protein;
  const fillingOptions = optionsByCategory.filling;
  const rolledOnOptions = optionsByCategory.rolledOn;
  const sauceOptions = optionsByCategory.sauce;
  const extraOptions = optionsByCategory.extra.slice(0, 12);

  const selectedBase = bases.find((option) => option.id === baseId) || bases[0];
  const selectedProtein = proteinOptions.find((option) => option.id === proteinId) || proteinOptions[0];
  const selectedSauce = sauceOptions.find((option) => option.id === sauceId) || sauceOptions[0];
  const selectedRolledOn = rolledOnOptions.find((option) => option.id === rolledOnId) || rolledOnOptions[0];
  const selectedFillingOptions = fillingOptions.filter((option) => selectedFillings.includes(option.id));
  const selectedExtraOptions = extraOptions.filter((option) => selectedExtras.includes(option.id));

  const total = useMemo(
    () =>
      selectedBase.price +
      selectedProtein.price +
      selectedSauce.price +
      selectedRolledOn.price +
      selectedFillingOptions.reduce((sum, option) => sum + option.price, 0) +
      selectedExtraOptions.reduce((sum, option) => sum + option.price, 0),
    [selectedBase, selectedProtein, selectedSauce, selectedRolledOn, selectedFillingOptions, selectedExtraOptions],
  );

  const toggleFilling = (id: string) => {
    setSelectedFillings((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= maxFillingsPerRoll) return current;
      return [...current, id];
    });
  };

  const toggleExtra = (id: string) => {
    setSelectedExtras((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= maxExtrasPerRoll) return current;
      return [...current, id];
    });
  };

  const optionLabel = (option: Option, labelPrefix?: string) =>
    option.label || (labelPrefix ? t(`${labelPrefix}.${option.id}`) : option.id);

  const handleModalWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const target = event.target as HTMLElement;
    const closestScrollable = target.closest('[data-byos-scroll="true"]') as HTMLElement | null;
    const scrollTarget = closestScrollable || mainScrollRef.current;

    if (!scrollTarget) return;

    const canScroll = scrollTarget.scrollHeight > scrollTarget.clientHeight;
    if (!canScroll && scrollTarget !== mainScrollRef.current && mainScrollRef.current) {
      mainScrollRef.current.scrollTop += event.deltaY;
      return;
    }

    scrollTarget.scrollTop += event.deltaY;
  };

  const reset = () => {
    setBaseId(bases[0].id);
    setProteinId(getDefaultCatalogId('protein'));
    setSauceId(getDefaultCatalogId('sauce'));
    setRolledOnId(getDefaultCatalogId('rolledOn'));
    setSelectedFillings(['cucumber']);
    setSelectedExtras([]);
    setNotes('');
  };

  const addCustomRoll = () => {
    const styleLabel = t(`buildYourSushi.options.bases.${selectedBase.id}`);
    const proteinLabel = optionLabel(selectedProtein);
    const fillingLabels = selectedFillingOptions.map((option) => optionLabel(option));
    const rolledLabel = optionLabel(selectedRolledOn);
    const extraLabels = selectedExtraOptions.map((option) => optionLabel(option));
    const sauceLabel = optionLabel(selectedSauce);
    const kitchenDetails = [
      `Style: ${styleLabel}`,
      `Protein: ${proteinLabel}`,
      `Fillings: ${fillingLabels.length ? fillingLabels.join(', ') : 'None'}`,
      `Rolled on: ${rolledLabel}`,
      extraLabels.length ? `Extras: ${extraLabels.join(', ')}` : '',
      `Sauce: ${sauceLabel}`,
      notes.trim() ? `Notes: ${notes.trim()}` : '',
    ].filter(Boolean);
    const ingredients = [
      styleLabel,
      proteinLabel,
      ...fillingLabels,
      rolledLabel,
      ...extraLabels,
      sauceLabel,
    ];
    const description = `${t('buildYourSushi.cartDescription', {
      ingredients: ingredients.join(', '),
    })}. ${kitchenDetails.join(' | ')}`;
    const item: MenuItem = {
      id: `custom-sushi-${Date.now()}`,
      name: t('buildYourSushi.cartName'),
      description: { en: description, fr: description, es: description },
      preparation: kitchenDetails.join(' | '),
      price: Number(total.toFixed(2)),
      image: '/images/build-your-own-sushi.png',
      category: 'Custom',
      ingredients,
      allergens: [],
      preparationTime: 18,
      spicyLevel: selectedSauce.id === 'spicyMayo' ? 1 : 0,
      popular: false,
      quantity: 1,
    };

    addToCart(item);
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex h-[100dvh] items-start justify-center overflow-hidden bg-black/80 p-3 backdrop-blur-md sm:items-center sm:p-4"
      onWheel={handleModalWheel}
    >
      <button className="absolute inset-0 z-0" onClick={onClose} aria-label={t('buildYourSushi.closeBuilder')} />

      <div className="byos-scroll relative z-10 flex h-[calc(100dvh-1.5rem)] w-full max-w-6xl flex-col overflow-y-auto rounded-[4px] border border-white/10 bg-[#090909] shadow-2xl sm:h-[92dvh] lg:grid lg:grid-cols-[1.25fr_0.75fr] lg:overflow-hidden">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-20 text-white/50 transition hover:text-white"
          aria-label={t('common.close', 'Close')}
        >
          <X className="h-5 w-5" />
        </button>

        <div
          ref={mainScrollRef}
          data-byos-scroll="true"
          className="byos-scroll p-5 sm:p-8 lg:min-h-0 lg:overflow-y-auto"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[4px] bg-[#f26350]/15 text-[#f26350]">
              <ChefHat className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">{t('buildYourSushi.title')}</h2>
              <p className="text-sm text-white/55">{t('buildYourSushi.builderSubtitle')}</p>
            </div>
          </div>

          <OptionGroup title={t('buildYourSushi.rollStyle')} labelPrefix="buildYourSushi.options.bases" options={bases} selectedIds={[baseId]} onSelect={setBaseId} />
          <OptionGroup title={t('buildYourSushi.protein')} options={proteinOptions} selectedIds={[proteinId]} onSelect={setProteinId} />
          <OptionGroup
            title={`${t('buildYourSushi.fillings')} (${selectedFillingOptions.length}/${maxFillingsPerRoll})`}
            options={fillingOptions}
            selectedIds={selectedFillings}
            onSelect={toggleFilling}
            multi
            disabledIds={selectedFillings.length >= maxFillingsPerRoll ? fillingOptions.filter((option) => !selectedFillings.includes(option.id)).map((option) => option.id) : []}
          />
          <OptionGroup title="Rolled on" options={rolledOnOptions} selectedIds={[rolledOnId]} onSelect={setRolledOnId} />
          {extraOptions.length > 0 && (
            <OptionGroup
              title={`Extras (${selectedExtraOptions.length}/${maxExtrasPerRoll})`}
              options={extraOptions}
              selectedIds={selectedExtras}
              onSelect={toggleExtra}
              multi
              disabledIds={selectedExtras.length >= maxExtrasPerRoll ? extraOptions.filter((option) => !selectedExtras.includes(option.id)).map((option) => option.id) : []}
            />
          )}
          <OptionGroup title={t('buildYourSushi.sauce')} options={sauceOptions} selectedIds={[sauceId]} onSelect={setSauceId} />

          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-bold uppercase tracking-[0.08em] text-white/70">{t('buildYourSushi.kitchenNotes')}</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="w-full rounded-[4px] border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-[#f26350]"
              placeholder={t('buildYourSushi.kitchenNotesPlaceholder')}
            />
          </label>
        </div>

        <aside
          data-byos-scroll="true"
          className="byos-scroll border-t border-white/10 bg-[#101010] p-5 sm:p-8 lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-t-0"
        >
          <h3 className="mb-5 text-xl font-black text-white">{t('buildYourSushi.summary')}</h3>
          <div className="space-y-3 text-sm">
            <SummaryRow label={t('buildYourSushi.summaryLabels.style')} value={t(`buildYourSushi.options.bases.${selectedBase.id}`)} />
            <SummaryRow label={t('buildYourSushi.summaryLabels.protein')} value={optionLabel(selectedProtein)} />
            <SummaryRow
              label={t('buildYourSushi.summaryLabels.fillings')}
              value={selectedFillingOptions.map((option) => optionLabel(option)).join(', ') || t('common.none', 'None')}
            />
            <SummaryRow label="Rolled" value={optionLabel(selectedRolledOn)} />
            {selectedExtraOptions.length > 0 && (
              <SummaryRow label="Extras" value={selectedExtraOptions.map((option) => optionLabel(option)).join(', ')} />
            )}
            <SummaryRow label={t('buildYourSushi.summaryLabels.sauce')} value={optionLabel(selectedSauce)} />
          </div>

          <div className="my-6 h-px bg-white/10" />

          <div className="mb-6 flex items-end justify-between">
            <span className="text-white/55">{t('buildYourSushi.estimatedTotal')}</span>
            <span className="text-3xl font-black text-white">${total.toFixed(2)}</span>
          </div>

          <div className="grid gap-3">
            <button
              onClick={addCustomRoll}
              className="flex items-center justify-center gap-2 rounded-[4px] bg-[#f26350] px-5 py-3 font-black uppercase tracking-[0.08em] text-white transition hover:bg-[#ff725f]"
            >
              <ShoppingCart className="h-4 w-4" />
              {t('buildYourSushi.addToCart')}
            </button>
            <button
              onClick={reset}
              className="flex items-center justify-center gap-2 rounded-[4px] border border-white/10 px-5 py-3 font-bold text-white/70 transition hover:bg-white/5 hover:text-white"
            >
              <RotateCcw className="h-4 w-4" />
              {t('buildYourSushi.reset')}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function OptionGroup({
  title,
  labelPrefix,
  options,
  selectedIds,
  onSelect,
  multi = false,
  disabledIds = [],
}: {
  title: string;
  labelPrefix?: string;
  options: Option[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  multi?: boolean;
  disabledIds?: string[];
}) {
  const { t } = useTranslation();

  return (
    <section className="mb-6">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-white/70">{title}</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const selected = selectedIds.includes(option.id);
          const disabled = disabledIds.includes(option.id);
          return (
            <button
              key={option.id}
              disabled={disabled}
              onClick={() => onSelect(option.id)}
              className={`flex items-center justify-between rounded-[4px] border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-35 ${selected
                ? 'border-[#f26350] bg-[#f26350]/12 text-white'
                : 'border-white/10 bg-black/40 text-white/68 hover:border-white/25 hover:text-white'
                }`}
            >
              <span className="flex items-center gap-2">
                {selected && <Check className="h-4 w-4 text-[#f26350]" />}
                <span className="font-semibold">{option.label || (labelPrefix ? t(`${labelPrefix}.${option.id}`) : option.id)}</span>
              </span>
              <span className="text-sm text-white/45">{option.price > 0 ? `${multi ? '+' : ''}$${option.price.toFixed(2)}` : 'Included'}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[88px_1fr] gap-3">
      <span className="text-white/45">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}
