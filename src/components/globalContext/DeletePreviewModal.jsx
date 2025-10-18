export default function DeletePreviewModal({ open, toDelete = [], onConfirm, onCancel }) {
    if (!open) return null;
    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
            <div style={{ background: '#fff', borderRadius: 10, padding: '1.25rem', maxWidth: 640, width: '90%' }}>
                <h3 style={{ marginTop: 0 }}>Arquivos que serão removidos</h3>
                <p style={{ color: '#333' }}>Confirme os arquivos abaixo. Eles serão apagados permanentemente do storage.</p>
                <div style={{ maxHeight: '40vh', overflow: 'auto', background: '#f8f8f8', padding: 12, borderRadius: 6 }}>
                    {toDelete.length === 0 ? (
                        <div style={{ color: '#666' }}>Nenhum arquivo será removido.</div>
                    ) : (
                        <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                            {toDelete.map((t, i) => (
                                <li key={i} style={{ marginBottom: 6 }}>{t.gs_url || t.filename}</li>
                            ))}
                        </ul>
                    )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                    <button onClick={onCancel} style={{ padding: '8px 12px', borderRadius: 6, border: 'none', background: '#ccc', color: '#222', cursor: 'pointer' }}>Cancelar</button>
                    <button onClick={onConfirm} style={{ padding: '8px 12px', borderRadius: 6, border: 'none', background: '#e74c3c', color: '#fff', cursor: 'pointer' }}>Confirmar remoção</button>
                </div>
            </div>
        </div>
    );
}
