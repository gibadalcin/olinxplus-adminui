// Retorna uma signed URL HTTP/HTTPS para uma imagem de conteúdo (GCS)
export async function getSignedContentUrl(gsUrl, filename) {
  const url = `${API_BASE_URL}/api/conteudo-signed-url?gs_url=${encodeURIComponent(gsUrl)}${filename ? `&filename=${encodeURIComponent(filename)}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data.signed_url || null;
}
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const getImages = async (token, ownerId) => {
  const url = ownerId
  ? `${API_BASE_URL}/images?ownerId=${ownerId}`
  : `${API_BASE_URL}/images`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`HTTP error! status: ${res.status}\n${errorText}`);
      return [];
    }
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const errorText = await res.text();
      console.error('Did not receive JSON response: ' + errorText);
      return [];
    }
    return await res.json();
  } catch (err) {
    console.error('Erro inesperado ao buscar imagens:', err);
    return [];
  }
};

export async function deleteImage(id, token) {
  try {
    const res = await fetch(`${API_BASE_URL}/delete-logo/?id=${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`HTTP error! status: ${res.status}\n${errorText}`);
      return { success: false };
    }
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const errorText = await res.text();
      console.error('Did not receive JSON response: ' + errorText);
      return { success: false };
    }
    return await res.json();
  } catch (err) {
    console.error('Erro inesperado ao deletar imagem:', err);
    return { success: false };
  }
}

export async function uploadLogo(formData, token) {
  try {
    const res = await fetch(`${API_BASE_URL}/add-logo/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`HTTP error! status: ${res.status}\n${errorText}`);
      return { success: false };
    }
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const errorText = await res.text();
      console.error('Did not receive JSON response: ' + errorText);
      return { success: false };
    }
    return await res.json();
  } catch (err) {
    console.error('Erro inesperado ao enviar logo:', err);
    return { success: false };
  }
}

export async function createAdmin(email, password, token) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`HTTP error! status: ${res.status}\n${errorText}`);
      return { success: false };
    }
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const errorText = await res.text();
      console.error('Did not receive JSON response: ' + errorText);
      return { success: false };
    }
    return await res.json();
  } catch (err) {
    console.error('Erro inesperado ao criar admin:', err);
    return { success: false };
  }
}

export async function deleteAdmin(uid, token) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ uid })
    });
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`HTTP error! status: ${res.status}\n${errorText}`);
      return { success: false };
    }
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const errorText = await res.text();
      console.error('Did not receive JSON response: ' + errorText);
      return { success: false };
    }
    return await res.json();
  } catch (err) {
    console.error('Erro inesperado ao deletar admin:', err);
    return { success: false };
  }
}

// Exemplo de função fetchAdmins no api.js
export async function fetchAdmins(token) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/list`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`HTTP error! status: ${res.status}\n${errorText}`);
      return [];
    }
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const errorText = await res.text();
      console.error('Did not receive JSON response: ' + errorText);
      return [];
    }
    return await res.json();
  } catch (err) {
    console.error('Erro inesperado ao buscar administradores:', err);
    return [];
  }
}

export async function fetchMarcas(ownerId, token) {
  const url = `${API_BASE_URL}/api/marcas?ownerId=${ownerId}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status === 404) return [];
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`HTTP error! status: ${res.status}\n${errorText}`);
      return [];
    }
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const errorText = await res.text();
      console.error('Did not receive JSON response: ' + errorText);
      return [];
    }
    return await res.json();
  } catch (err) {
    console.error('Erro inesperado ao buscar marcas:', err);
    return [];
  }
}

export async function fetchImagesByOwner(ownerId, token) {
  try {
    const res = await fetch(`${API_BASE_URL}/images?ownerId=${ownerId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`HTTP error! status: ${res.status}\n${errorText}`);
      return [];
    }
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const errorText = await res.text();
      console.error('Did not receive JSON response: ' + errorText);
      return [];
    }
    return await res.json();
  } catch (err) {
    console.error('Erro inesperado ao buscar imagens:', err);
    return [];
  }
}

export async function uploadContentImage(formData, token) {
  try {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    // Ask the server for JSON responses
    headers['Accept'] = 'application/json';
    const res = await fetch(`${API_BASE_URL}/add-content-image/`, {
      method: "POST",
      headers,
      body: formData
    });
    if (res.ok) {
      // tenta ler JSON normalmente
      try {
        return await res.json();
      } catch (e) {
        return { success: false, status: res.status, error: 'Resposta inválida do servidor (não é JSON)' };
      }
    }
    // Em caso de erro, tenta decodificar corpo para ajudar debug
    const contentType = res.headers.get('content-type') || '';
    let errBody = null;
    try {
      if (contentType.includes('application/json')) errBody = await res.json();
      else errBody = await res.text();
    } catch (e) {
      errBody = `Falha ao ler corpo de erro: ${String(e)}`;
    }
    console.error('[uploadContentImage] upload failed', { status: res.status, contentType, errBody });
    return { success: false, status: res.status, error: errBody };
  } catch (err) {
    console.error('Erro inesperado ao chamar uploadContentImage:', err);
    return { success: false, error: String(err) };
  }
}