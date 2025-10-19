// Runtime helper + types for button blocks

export const BUTTON_VARIANTS = ['primary', 'secondary', 'tertiary'];
export const BUTTON_SIZES = ['small', 'medium', 'large'];
export const BUTTON_POSITIONS = ['left', 'center', 'right'];

export function isValidColor(v) {
    if (!v) return true;
    if (typeof v !== 'string') return false;
    if (v.startsWith('#') && (v.length === 4 || v.length === 7)) return true;
    if (/^[a-zA-Z]+$/.test(v)) return true; // css color name
    return false;
}

export function validateButtonBlock(b) {
    if (!b || typeof b !== 'object') return { ok: false, error: 'invalid payload' };
    if (!b.tipo || !['botao_destaque', 'botao_default'].includes(b.tipo)) return { ok: false, error: 'tipo must be botao_destaque or botao_default' };
    if (!b.label || typeof b.label !== 'string' || b.label.trim() === '') return { ok: false, error: 'label is required' };
    if (!b.action || typeof b.action !== 'object') return { ok: false, error: 'action is required' };
    if (!b.action.type || !['link', 'callback'].includes(b.action.type)) return { ok: false, error: 'action.type must be link or callback' };
    if (b.action.type === 'link' && (!b.action.href || typeof b.action.href !== 'string')) return { ok: false, error: 'href is required for link actions' };
    if (b.action.type === 'callback' && (!b.action.name || typeof b.action.name !== 'string')) return { ok: false, error: 'name is required for callback actions' };
    if (b.color && !isValidColor(b.color)) return { ok: false, error: 'invalid color format' };
    if (b.variant && !BUTTON_VARIANTS.includes(b.variant)) return { ok: false, error: 'invalid variant' };
    if (b.size && !BUTTON_SIZES.includes(b.size)) return { ok: false, error: 'invalid size' };
    if (b.position && !BUTTON_POSITIONS.includes(b.position)) return { ok: false, error: 'invalid position' };
    return { ok: true };
}

export const exampleButtonDestaque = {
    tipo: 'botao_destaque',
    label: 'Agende uma visita',
    action: { type: 'link', href: 'https://example.com/schedule', target: '_blank' },
    variant: 'primary',
    color: '#ff3b30',
    icon: 'calendar',
    size: 'large',
    analytics: { event_name: 'cta_click', params: { cta: 'schedule' } },
    position: 'center'
};

export const exampleButtonDefault = {
    tipo: 'botao_default',
    label: 'Saiba mais',
    action: { type: 'link', href: '/info' },
    variant: 'secondary',
    color: '#2196f3',
    size: 'medium',
    position: 'left'
};
