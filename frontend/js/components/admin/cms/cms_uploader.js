// Submódulo del CMS: Gestor reactivo de subida y previsualización de imágenes.
// Acá centralizo la interacción con los inputs de archivos, la llamada al endpoint
// de streaming del backend (/api/v1/admin/upload-image) y la actualización de miniaturas.

import { apiService } from '../../../services/api.js';

export function attachImageManagementEvents(container, showToast) {
  // 1. Previsualización en vivo al escribir o pegar una URL
  container.querySelectorAll('.cms-img-input').forEach(input => {
    const previewId = input.dataset.previewTarget;
    if (!previewId) return;
    const previewEl = document.getElementById(previewId);
    if (!previewEl) return;

    const updateThumb = () => {
      const val = input.value.trim();
      if (val) {
        previewEl.src = val;
        previewEl.style.display = 'block';
      } else {
        previewEl.style.display = 'none';
      }
    };
    input.addEventListener('input', updateThumb);
    input.addEventListener('change', updateThumb);
  });

  // 2. Subida de archivos desde el disco local
  container.querySelectorAll('.btn-cms-upload').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetInputId = btn.dataset.targetInput;
      const targetInput = document.getElementById(targetInputId);
      if (!targetInput) return;

      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      // Restringido a formatos rasterizados seguros (sin SVG ejecutable)
      fileInput.accept = 'image/png,image/jpeg,image/webp';
      fileInput.style.display = 'none';
      document.body.appendChild(fileInput);

      fileInput.addEventListener('change', async () => {
        if (!fileInput.files || !fileInput.files[0]) {
          fileInput.remove();
          return;
        }
        const file = fileInput.files[0];
        const originalHtml = btn.innerHTML;
        btn.innerHTML = `<span class="material-symbols-outlined cms-spin" style="font-size: 14px;">progress_activity</span> <span>Subiendo</span>`;
        btn.classList.add('uploading');

        try {
          const res = await apiService.uploadAdminImage(file);
          if (res && res.url) {
            targetInput.value = res.url;
            // Emito evento input para que la miniatura se actualice de inmediato
            targetInput.dispatchEvent(new Event('input', { bubbles: true }));
            showToast(`Imagen subida con éxito: ${res.filename}`, "success");
          }
        } catch (err) {
          console.error("Fallo al subir imagen:", err);
          if (err.message === "UNAUTHORIZED") {
            showToast(`No autorizado: Debes ingresar la clave del taller.`, "error");
            window.dispatchEvent(new CustomEvent('senkai:workshop-unauthorized'));
          } else {
            showToast(`Error al subir: ${err.message || "Fallo de conexión"}`, "error");
          }
        } finally {
          btn.innerHTML = originalHtml;
          btn.classList.remove('uploading');
          fileInput.remove();
        }
      });

      fileInput.click();
    });
  });

  // 3. Botón para quitar foto y volver al vector técnico
  container.querySelectorAll('.btn-cms-clear').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetInputId = btn.dataset.targetInput;
      const targetInput = document.getElementById(targetInputId);
      const previewId = btn.dataset.previewTarget;
      const previewEl = document.getElementById(previewId);
      const fallback = btn.dataset.fallback || '/static/assets/garments/tshirt_front.png';

      if (targetInput) {
        targetInput.value = '';
        targetInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (previewEl) {
        previewEl.src = fallback;
        previewEl.style.display = 'block';
      }
      showToast('Foto retirada. Se utilizará el vector base del taller.', 'info');
    });
  });
}
