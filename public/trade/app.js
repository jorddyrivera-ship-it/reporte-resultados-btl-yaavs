(() => {
  const cfg = window.YAAVS_TRADE_CONFIG || {};
  const opts = window.YAAVS_TRADE_OPTIONS || {};
  const form = document.getElementById("tradeForm");
  const successPanel = document.getElementById("successPanel");
  const toast = document.getElementById("toast");
  const hint = document.getElementById("formHint");
  const submitBtn = document.getElementById("submitBtn");

  if (!form) {
    console.error("[trade] No se encontró #tradeForm.");
    return;
  }

  const EXCLUDE_PRODUCTOS = "Ninguno de los anteriores";
  const EXCLUDE_MATERIALES = "No he recibido materiales";
  const EXCLUDE_APOYOS = "No requiero apoyo por ahora";
  const EXCLUDE_REDES = ["No sigo a YAAVS en redes sociales", "No recuerdo"];
  const EXCLUDE_EXHIBIDOS = "No hay materiales exhibidos";

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.hidden = false;
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => {
      toast.hidden = true;
    }, 3200);
  }

  function isBlank(v) {
    return v == null || String(v).trim() === "";
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function clearInvalid() {
    form.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));
  }

  function markInvalid(el) {
    if (!el) return;
    el.classList.add("is-invalid");
  }

  function focusFirstInvalid() {
    const el =
      form.querySelector(".is-invalid input, .is-invalid textarea, .is-invalid select, input.is-invalid, textarea.is-invalid, select.is-invalid") ||
      form.querySelector(".is-invalid");
    el?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    if (el && typeof el.focus === "function" && el.tagName !== "DIV") el.focus();
  }

  function fillScale(boxId, name, from, to) {
    const box = document.getElementById(boxId);
    if (!box) return;
    const items = [];
    for (let n = from; n <= to; n++) items.push(n);
    box.innerHTML = items
      .map((n) => `<label><input type="radio" name="${name}" value="${n}" required /><span>${n}</span></label>`)
      .join("");
  }

  function fillChecks(boxId, name, items) {
    const box = document.getElementById(boxId);
    if (!box) return;
    box.innerHTML = (items || [])
      .map(
        (label) =>
          `<label><input type="checkbox" name="${name}" value="${escapeHtml(label)}" /> <span>${escapeHtml(
            label,
          )}</span></label>`,
      )
      .join("");
  }

  function fillRadios(boxId, name, items) {
    const box = document.getElementById(boxId);
    if (!box) return;
    box.innerHTML = (items || [])
      .map(
        (label) =>
          `<label><input type="radio" name="${name}" value="${escapeHtml(label)}" required /> <span>${escapeHtml(
            label,
          )}</span></label>`,
      )
      .join("");
  }

  function fillVentasSemana() {
    const box = document.getElementById("ventasSemanaBox");
    if (!box) return;
    box.innerHTML = (opts.ventasSemanaKeys || [])
      .map(
        (item) => `
        <label class="field">
          <span>${escapeHtml(item.label)} <span class="req">*</span></span>
          <input type="number" min="0" step="1" name="venta_${item.key}" required placeholder="0" />
        </label>`,
      )
      .join("");
  }

  function fillComisiones() {
    const box = document.getElementById("comisionesBox");
    if (!box) return;
    box.innerHTML = (opts.comisionProductos || [])
      .map(
        (item) => `
        <div class="comision-row">
          <strong>${escapeHtml(item.label)}</strong>
          <input type="text" name="comision_${item.key}_monto" placeholder="Comisión ($ o %)" />
          <input type="text" name="comision_${item.key}_condicion" placeholder="Operación / condición" />
        </div>`,
      )
      .join("");
  }

  function checked(name) {
    return [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((el) => el.value);
  }

  function radio(name) {
    return form.querySelector(`input[name="${name}"]:checked`)?.value || "";
  }

  function syncExclusiveChecks(name, excludeValues, onChange) {
    const selected = checked(name);
    const hasExclude = selected.some((v) => excludeValues.includes(v));
    if (hasExclude && selected.length > 1) {
      form.querySelectorAll(`input[name="${name}"]`).forEach((el) => {
        if (!excludeValues.includes(el.value)) el.checked = false;
      });
    }
    onChange?.();
  }

  function syncOtro(name, wrapId, inputName, otroLabel = "Otro") {
    const selected = checked(name);
    const val = radio(name);
    const isCheck = form.querySelectorAll(`input[name="${name}"][type="checkbox"]`).length > 0;
    const open = isCheck ? selected.some((v) => v === otroLabel || v.startsWith("Otra")) : val === otroLabel || val.startsWith("Otra");
    const wrap = document.getElementById(wrapId);
    const input = form.elements.namedItem(inputName);
    if (!wrap || !input) return;
    wrap.hidden = !open;
    if (!open) {
      input.value = "";
      input.removeAttribute("required");
      input.classList.remove("is-invalid");
    } else {
      input.setAttribute("required", "required");
    }
  }

  function syncProductos() {
    syncExclusiveChecks("productos", [EXCLUDE_PRODUCTOS]);
    const selected = checked("productos");
    const ninguno = selected.includes(EXCLUDE_PRODUCTOS);
    syncOtro("productos", "productosOtroWrap", "productosOtro", "Otro");

    const wrap = document.getElementById("productoMayorDemandaWrap");
    const select = document.getElementById("productoMayorDemanda");
    if (!wrap || !select) return;

    if (ninguno || !selected.length) {
      wrap.hidden = true;
      select.innerHTML = '<option value="">Selecciona…</option>';
      select.value = "";
      select.removeAttribute("required");
      return;
    }

    wrap.hidden = false;
    select.setAttribute("required", "required");
    const options = selected.filter((v) => v !== "Otro" && v !== EXCLUDE_PRODUCTOS);
    if (selected.includes("Otro")) {
      const otro = String(form.elements.namedItem("productosOtro")?.value || "").trim();
      if (otro) options.push(otro);
    }
    const prev = select.value;
    select.innerHTML =
      '<option value="">Selecciona…</option>' +
      options.map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join("");
    if (options.includes(prev)) select.value = prev;
  }

  function syncMaterialesRecibidos() {
    syncExclusiveChecks("materialesRecibidos", [EXCLUDE_MATERIALES]);
    syncOtro("materialesRecibidos", "materialesRecibidosOtroWrap", "materialesRecibidosOtro", "Otro");
  }

  function syncApoyos() {
    const selected = checked("apoyosNecesarios");
    const noApoyo = selected.includes(EXCLUDE_APOYOS);
    if (noApoyo && selected.length > 1) {
      form.querySelectorAll('input[name="apoyosNecesarios"]').forEach((el) => {
        if (el.value !== EXCLUDE_APOYOS) el.checked = false;
      });
    }
    // max 3 (excluding "No requiero")
    let current = checked("apoyosNecesarios").filter((v) => v !== EXCLUDE_APOYOS);
    if (current.length > 3) {
      // uncheck the last clicked if over limit - handled in change by reverting
    }
    syncOtro("apoyosNecesarios", "apoyosNecesariosOtroWrap", "apoyosNecesariosOtro", "Otro");

    const wrap = document.getElementById("apoyoMasUrgenteWrap");
    const select = document.getElementById("apoyoMasUrgente");
    current = checked("apoyosNecesarios");
    const none = current.includes(EXCLUDE_APOYOS) || !current.length;
    if (!wrap || !select) return;
    if (none) {
      wrap.hidden = true;
      select.innerHTML = '<option value="">Selecciona…</option>';
      select.value = "";
      select.removeAttribute("required");
      return;
    }
    wrap.hidden = false;
    select.setAttribute("required", "required");
    const options = current.filter((v) => v !== "Otro" && v !== EXCLUDE_APOYOS);
    if (current.includes("Otro")) {
      const otro = String(form.elements.namedItem("apoyosNecesariosOtro")?.value || "").trim();
      if (otro) options.push(otro);
    }
    const prev = select.value;
    select.innerHTML =
      '<option value="">Selecciona…</option>' +
      options.map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join("");
    if (options.includes(prev)) select.value = prev;
  }

  function syncActivacion() {
    const wrap = document.getElementById("utilidadActivacionWrap");
    const open = radio("activacionRealizada") === "Sí";
    wrap.hidden = !open;
    const box = document.getElementById("utilidadActivacionBox");
    if (!open) {
      box.querySelectorAll("input").forEach((el) => {
        el.checked = false;
        el.removeAttribute("required");
      });
      box.classList.remove("is-invalid");
    } else {
      box.querySelectorAll("input").forEach((el) => el.setAttribute("required", "required"));
    }
  }

  function syncRedes() {
    syncExclusiveChecks("redesSociales", EXCLUDE_REDES);
    syncOtro("redesSociales", "redesSocialesOtroWrap", "redesSocialesOtro", "Otra");
  }

  function syncMedioInfo() {
    syncOtro("medioInfo", "medioInfoOtroWrap", "medioInfoOtro", "Otro");
  }

  function syncCarrier() {
    syncOtro("carrierVolumen", "carrierVolumenOtroWrap", "carrierVolumenOtro", "Otra");
  }

  function syncDistribuidor() {
    const open = radio("otroDistribuidor") === "Sí";
    document.getElementById("otroDistribuidorWrap").hidden = !open;
    document.getElementById("comisionesSection").hidden = !open;
    if (!open) {
      const cual = form.elements.namedItem("otroDistribuidorCual");
      if (cual) cual.value = "";
    }
  }

  function syncFormatoPdv() {
    syncOtro("formatoPdv", "formatoPdvOtroWrap", "formatoPdvOtro", "Otro");
  }

  function syncEntornoPdv() {
    syncOtro("entornoPdv", "entornoPdvOtroWrap", "entornoPdvOtro", "Otro");
    const entorno = radio("entornoPdv");
    const wrap = document.getElementById("ubicacionCalleWrap");
    const show = entorno === "Calle o colonia";
    wrap.hidden = !show;
    if (!show) {
      form.querySelectorAll('input[name="ubicacionCalle"]').forEach((el) => {
        el.checked = false;
      });
    }
  }

  function syncMaterialesExhibidos() {
    syncExclusiveChecks("materialesExhibidos", [EXCLUDE_EXHIBIDOS]);
    syncOtro("materialesExhibidos", "materialesExhibidosOtroWrap", "materialesExhibidosOtro", "Otro");
    const none = checked("materialesExhibidos").includes(EXCLUDE_EXHIBIDOS);
    const wrap = document.getElementById("observacionMaterialesWrap");
    wrap.hidden = none;
    if (none) {
      ["estadoMateriales", "visibilidadMensajes", "vigenciaPromociones"].forEach((name) => {
        form.querySelectorAll(`input[name="${name}"]`).forEach((el) => {
          el.checked = false;
        });
      });
      ["estadoMaterialesDetalle", "visibilidadDetalle", "vigenciaDetalle"].forEach((n) => {
        const el = form.elements.namedItem(n);
        if (el) el.value = "";
      });
      document.getElementById("estadoMaterialesDetalleWrap").hidden = true;
      document.getElementById("visibilidadDetalleWrap").hidden = true;
      document.getElementById("vigenciaDetalleWrap").hidden = true;
    }
  }

  function syncEstadoMateriales() {
    const val = radio("estadoMateriales");
    const wrap = document.getElementById("estadoMaterialesDetalleWrap");
    const open = val === "Hay material roto o muy deteriorado";
    wrap.hidden = !open;
    const input = form.elements.namedItem("estadoMaterialesDetalle");
    if (!open) {
      input.value = "";
      input.removeAttribute("required");
    } else {
      input.setAttribute("required", "required");
    }
  }

  function syncVisibilidad() {
    const val = radio("visibilidadMensajes");
    const wrap = document.getElementById("visibilidadDetalleWrap");
    wrap.hidden = !(val === "Parcial: algunos no se ven o no se leen" || val === "Mala: los mensajes principales no se leen");
  }

  function syncVigencia() {
    const val = radio("vigenciaPromociones");
    const wrap = document.getElementById("vigenciaDetalleWrap");
    wrap.hidden = val !== "Hay promociones vencidas";
  }

  function collectAnswers() {
    const fd = new FormData(form);
    const productos = checked("productos");
    const materialesRecibidos = checked("materialesRecibidos");
    const apoyosNecesarios = checked("apoyosNecesarios");
    const redesSociales = checked("redesSociales");
    const materialesExhibidos = checked("materialesExhibidos");
    const otroDistribuidor = radio("otroDistribuidor");
    const activacionRealizada = radio("activacionRealizada");
    const noMaterialesExhibidos = materialesExhibidos.includes(EXCLUDE_EXHIBIDOS);

    const ventasSemana = {};
    (opts.ventasSemanaKeys || []).forEach((item) => {
      ventasSemana[item.key] = String(fd.get(`venta_${item.key}`) || "").trim();
    });

    const comisiones = {};
    if (otroDistribuidor === "Sí") {
      (opts.comisionProductos || []).forEach((item) => {
        comisiones[item.key] = {
          monto: String(fd.get(`comision_${item.key}_monto`) || "").trim(),
          condicion: String(fd.get(`comision_${item.key}_condicion`) || "").trim(),
        };
      });
    }

    return {
      fechaEncuesta: String(fd.get("fechaEncuesta") || "").trim(),
      claveYaavser: String(fd.get("claveYaavser") || "").trim(),
      nombreNegocio: String(fd.get("nombreNegocio") || "").trim(),
      estado: String(fd.get("estado") || "").trim(),
      municipio: String(fd.get("municipio") || "").trim(),
      ejecutivoVentas: String(fd.get("ejecutivoVentas") || "").trim(),
      coordinadoraTrade: String(fd.get("coordinadoraTrade") || "").trim(),
      satisfaccionGeneral: String(fd.get("satisfaccionGeneral") || "").trim(),
      satisfaccionGeneralPorque: String(fd.get("satisfaccionGeneralPorque") || "").trim(),
      nps: String(fd.get("nps") || "").trim(),
      atencionEjecutivo: String(fd.get("atencionEjecutivo") || "").trim(),
      atencionPorque: String(fd.get("atencionPorque") || "").trim(),
      frecuenciaVisita: radio("frecuenciaVisita"),
      productos,
      productosOtro: String(fd.get("productosOtro") || "").trim(),
      productoMayorDemanda: productos.includes(EXCLUDE_PRODUCTOS)
        ? ""
        : String(fd.get("productoMayorDemanda") || "").trim(),
      ventasSemana,
      carrierVolumen: radio("carrierVolumen"),
      carrierVolumenOtro: String(fd.get("carrierVolumenOtro") || "").trim(),
      materialesRecibidos,
      materialesRecibidosOtro: String(fd.get("materialesRecibidosOtro") || "").trim(),
      apoyosNecesarios,
      apoyosNecesariosOtro: String(fd.get("apoyosNecesariosOtro") || "").trim(),
      apoyoMasUrgente: apoyosNecesarios.includes(EXCLUDE_APOYOS)
        ? ""
        : String(fd.get("apoyoMasUrgente") || "").trim(),
      activacionRealizada,
      utilidadActivacion: activacionRealizada === "Sí" ? radio("utilidadActivacion") : "",
      redesSociales,
      redesSocialesOtro: String(fd.get("redesSocialesOtro") || "").trim(),
      visitaWeb: radio("visitaWeb"),
      medioInfo: radio("medioInfo"),
      medioInfoOtro: String(fd.get("medioInfoOtro") || "").trim(),
      otroDistribuidor,
      otroDistribuidorCual: otroDistribuidor === "Sí" ? String(fd.get("otroDistribuidorCual") || "").trim() : "",
      comisiones,
      cambioImportante: String(fd.get("cambioImportante") || "").trim(),
      formatoPdv: radio("formatoPdv"),
      formatoPdvOtro: String(fd.get("formatoPdvOtro") || "").trim(),
      entornoPdv: radio("entornoPdv"),
      entornoPdvOtro: String(fd.get("entornoPdvOtro") || "").trim(),
      ubicacionCalle: radio("entornoPdv") === "Calle o colonia" ? radio("ubicacionCalle") : "",
      materialesExhibidos,
      materialesExhibidosOtro: String(fd.get("materialesExhibidosOtro") || "").trim(),
      estadoMateriales: noMaterialesExhibidos ? "" : radio("estadoMateriales"),
      estadoMaterialesDetalle: String(fd.get("estadoMaterialesDetalle") || "").trim(),
      visibilidadMensajes: noMaterialesExhibidos ? "" : radio("visibilidadMensajes"),
      visibilidadDetalle: String(fd.get("visibilidadDetalle") || "").trim(),
      vigenciaPromociones: noMaterialesExhibidos ? "" : radio("vigenciaPromociones"),
      vigenciaDetalle: String(fd.get("vigenciaDetalle") || "").trim(),
      evidenciaSeguimiento: String(fd.get("evidenciaSeguimiento") || "").trim(),
    };
  }

  function validate(a) {
    clearInvalid();
    const req = (cond, el, msg) => {
      if (cond) {
        markInvalid(el);
        return msg;
      }
      return "";
    };

    let err =
      req(isBlank(a.fechaEncuesta), form.elements.namedItem("fechaEncuesta"), "Captura la fecha.") ||
      req(isBlank(a.claveYaavser), form.elements.namedItem("claveYaavser"), "Captura la clave YAAVSER.") ||
      req(isBlank(a.nombreNegocio), form.elements.namedItem("nombreNegocio"), "Captura el nombre del negocio.") ||
      req(isBlank(a.estado), form.elements.namedItem("estado"), "Captura el estado.") ||
      req(isBlank(a.municipio), form.elements.namedItem("municipio"), "Captura el municipio o alcaldía.") ||
      req(isBlank(a.ejecutivoVentas), form.elements.namedItem("ejecutivoVentas"), "Captura el ejecutivo de ventas.") ||
      req(isBlank(a.coordinadoraTrade), form.elements.namedItem("coordinadoraTrade"), "Captura la coordinadora de Trade.") ||
      req(isBlank(a.satisfaccionGeneral), document.getElementById("satisfaccionGeneralBox"), "Califica la satisfacción general.") ||
      req(isBlank(a.satisfaccionGeneralPorque), form.elements.namedItem("satisfaccionGeneralPorque"), "Indica por qué esa satisfacción.") ||
      req(isBlank(a.nps), document.getElementById("npsScale"), "Selecciona la probabilidad de recomendación (0 a 5).") ||
      req(isBlank(a.atencionEjecutivo), document.getElementById("atencionBox"), "Califica la atención del ejecutivo.") ||
      req(isBlank(a.atencionPorque), form.elements.namedItem("atencionPorque"), "Indica por qué esa calificación de atención.") ||
      req(isBlank(a.frecuenciaVisita), document.getElementById("frecuenciaBox"), "Indica la frecuencia de visita.");
    if (err) return err;

    if (!a.productos.length) return markInvalid(document.getElementById("productosBox")), "Marca al menos un producto o servicio.";
    if (a.productos.includes("Otro") && isBlank(a.productosOtro)) {
      return markInvalid(form.elements.namedItem("productosOtro")), "Especifica el otro producto.";
    }
    if (!a.productos.includes(EXCLUDE_PRODUCTOS) && isBlank(a.productoMayorDemanda)) {
      return markInvalid(document.getElementById("productoMayorDemanda")), "Indica cuál producto tiene mayor demanda.";
    }

    for (const item of opts.ventasSemanaKeys || []) {
      if (isBlank(a.ventasSemana[item.key])) {
        return markInvalid(form.elements.namedItem(`venta_${item.key}`)), `Captura la cantidad de ${item.label}.`;
      }
    }

    if (isBlank(a.carrierVolumen)) return markInvalid(document.getElementById("carrierVolumenBox")), "Indica la compañía con mayor volumen.";
    if (a.carrierVolumen === "Otra" && isBlank(a.carrierVolumenOtro)) {
      return markInvalid(form.elements.namedItem("carrierVolumenOtro")), "Especifica la otra compañía.";
    }

    if (!a.materialesRecibidos.length) {
      return markInvalid(document.getElementById("materialesRecibidosBox")), "Marca al menos una opción de materiales recibidos.";
    }
    if (a.materialesRecibidos.includes("Otro") && isBlank(a.materialesRecibidosOtro)) {
      return markInvalid(form.elements.namedItem("materialesRecibidosOtro")), "Especifica el otro material recibido.";
    }

    if (!a.apoyosNecesarios.length) {
      return markInvalid(document.getElementById("apoyosNecesariosBox")), "Marca al menos un apoyo (o que no requieres).";
    }
    const apoyosActivos = a.apoyosNecesarios.filter((v) => v !== EXCLUDE_APOYOS);
    if (apoyosActivos.length > 3) {
      return markInvalid(document.getElementById("apoyosNecesariosBox")), "Selecciona máximo 3 apoyos.";
    }
    if (a.apoyosNecesarios.includes("Otro") && isBlank(a.apoyosNecesariosOtro)) {
      return markInvalid(form.elements.namedItem("apoyosNecesariosOtro")), "Especifica el otro apoyo.";
    }
    if (!a.apoyosNecesarios.includes(EXCLUDE_APOYOS) && isBlank(a.apoyoMasUrgente)) {
      return markInvalid(document.getElementById("apoyoMasUrgente")), "Indica el apoyo más urgente.";
    }

    if (isBlank(a.activacionRealizada)) {
      return markInvalid(document.getElementById("activacionRealizadaBox")), "Indica si hubo activación.";
    }
    if (a.activacionRealizada === "Sí" && isBlank(a.utilidadActivacion)) {
      return markInvalid(document.getElementById("utilidadActivacionBox")), "Califica la utilidad de la activación.";
    }

    if (!a.redesSociales.length) {
      return markInvalid(document.getElementById("redesSocialesBox")), "Marca al menos una opción de redes sociales.";
    }
    if (a.redesSociales.includes("Otra") && isBlank(a.redesSocialesOtro)) {
      return markInvalid(form.elements.namedItem("redesSocialesOtro")), "Especifica la otra red social.";
    }

    if (isBlank(a.visitaWeb)) return markInvalid(document.getElementById("visitaWebBox")), "Indica si visitaste la página web.";
    if (isBlank(a.medioInfo)) return markInvalid(document.getElementById("medioInfoBox")), "Indica el medio preferido de información.";
    if (a.medioInfo === "Otro" && isBlank(a.medioInfoOtro)) {
      return markInvalid(form.elements.namedItem("medioInfoOtro")), "Especifica el otro medio.";
    }

    if (isBlank(a.otroDistribuidor)) {
      return markInvalid(document.getElementById("otroDistribuidorBox")), "Indica si trabajas con otro distribuidor.";
    }
    if (isBlank(a.cambioImportante)) {
      return markInvalid(form.elements.namedItem("cambioImportante")), "Describe el cambio más importante.";
    }

    if (isBlank(a.formatoPdv)) return markInvalid(document.getElementById("formatoPdvBox")), "Indica el formato del PDV.";
    if (a.formatoPdv === "Otro" && isBlank(a.formatoPdvOtro)) {
      return markInvalid(form.elements.namedItem("formatoPdvOtro")), "Especifica el otro formato.";
    }
    if (isBlank(a.entornoPdv)) return markInvalid(document.getElementById("entornoPdvBox")), "Indica el entorno del PDV.";
    if (a.entornoPdv === "Otro" && isBlank(a.entornoPdvOtro)) {
      return markInvalid(form.elements.namedItem("entornoPdvOtro")), "Especifica el otro entorno.";
    }
    if (a.entornoPdv === "Calle o colonia" && isBlank(a.ubicacionCalle)) {
      return markInvalid(document.getElementById("ubicacionCalleBox")), "Indica la ubicación en la calle.";
    }

    if (!a.materialesExhibidos.length) {
      return markInvalid(document.getElementById("materialesExhibidosBox")), "Marca materiales exhibidos (o que no hay).";
    }
    if (a.materialesExhibidos.includes("Otro") && isBlank(a.materialesExhibidosOtro)) {
      return markInvalid(form.elements.namedItem("materialesExhibidosOtro")), "Especifica el otro material exhibido.";
    }

    if (!a.materialesExhibidos.includes(EXCLUDE_EXHIBIDOS)) {
      if (isBlank(a.estadoMateriales)) {
        return markInvalid(document.getElementById("estadoMaterialesBox")), "Indica el estado físico de los materiales.";
      }
      if (a.estadoMateriales === "Hay material roto o muy deteriorado" && isBlank(a.estadoMaterialesDetalle)) {
        return markInvalid(form.elements.namedItem("estadoMaterialesDetalle")), "Describe el material afectado.";
      }
      if (isBlank(a.visibilidadMensajes)) {
        return markInvalid(document.getElementById("visibilidadMensajesBox")), "Indica la visibilidad de los mensajes.";
      }
      if (isBlank(a.vigenciaPromociones)) {
        return markInvalid(document.getElementById("vigenciaPromocionesBox")), "Indica la vigencia de las promociones.";
      }
    }

    return "";
  }

  form.addEventListener("change", (e) => {
    const t = e.target;
    t?.classList?.remove("is-invalid");
    t?.closest?.(".nps-scale, .check-grid, .choice-list, .choice-scale, .field, .ventas-semana-grid, .comisiones-grid")?.classList.remove(
      "is-invalid",
    );

    if (t?.name === "apoyosNecesarios" && t.checked && t.value !== EXCLUDE_APOYOS) {
      const current = checked("apoyosNecesarios").filter((v) => v !== EXCLUDE_APOYOS);
      if (current.length > 3) {
        t.checked = false;
        showToast("Máximo 3 apoyos.");
      }
    }

    if (t?.name === "productos" || t?.name === "productosOtro") syncProductos();
    if (t?.name === "materialesRecibidos") syncMaterialesRecibidos();
    if (t?.name === "apoyosNecesarios" || t?.name === "apoyosNecesariosOtro") syncApoyos();
    if (t?.name === "activacionRealizada") syncActivacion();
    if (t?.name === "redesSociales") syncRedes();
    if (t?.name === "medioInfo") syncMedioInfo();
    if (t?.name === "carrierVolumen") syncCarrier();
    if (t?.name === "otroDistribuidor") syncDistribuidor();
    if (t?.name === "formatoPdv") syncFormatoPdv();
    if (t?.name === "entornoPdv") syncEntornoPdv();
    if (t?.name === "materialesExhibidos") syncMaterialesExhibidos();
    if (t?.name === "estadoMateriales") syncEstadoMateriales();
    if (t?.name === "visibilidadMensajes") syncVisibilidad();
    if (t?.name === "vigenciaPromociones") syncVigencia();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hint.textContent = "";
    const answers = collectAnswers();
    const err = validate(answers);
    if (err) {
      hint.textContent = err;
      showToast(err);
      focusFirstInvalid();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando…";
    try {
      const res = await fetch(cfg.submitUrl || "/api/trade/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, website: form.website?.value || "" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "No se pudo enviar");
      form.hidden = true;
      successPanel.hidden = false;
      showToast("Encuesta enviada");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err2) {
      hint.textContent = err2.message || "Error de red";
      showToast(hint.textContent);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Enviar encuesta";
    }
  });

  function syncAll() {
    syncProductos();
    syncMaterialesRecibidos();
    syncApoyos();
    syncActivacion();
    syncRedes();
    syncMedioInfo();
    syncCarrier();
    syncDistribuidor();
    syncFormatoPdv();
    syncEntornoPdv();
    syncMaterialesExhibidos();
    syncEstadoMateriales();
    syncVisibilidad();
    syncVigencia();
  }

  document.getElementById("anotherBtn")?.addEventListener("click", () => {
    form.reset();
    clearInvalid();
    syncAll();
    successPanel.hidden = true;
    form.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // Default fecha = today
  const fecha = form.elements.namedItem("fechaEncuesta");
  if (fecha && !fecha.value) {
    fecha.value = new Date().toISOString().slice(0, 10);
  }

  fillScale("satisfaccionGeneralBox", "satisfaccionGeneral", 1, 5);
  fillScale("npsScale", "nps", 0, 5);
  fillScale("atencionBox", "atencionEjecutivo", 1, 5);
  fillRadios("frecuenciaBox", "frecuenciaVisita", opts.frecuencia || []);
  fillChecks("productosBox", "productos", opts.productos || []);
  fillVentasSemana();
  fillRadios("carrierVolumenBox", "carrierVolumen", opts.carrierVolumen || []);
  fillChecks("materialesRecibidosBox", "materialesRecibidos", opts.materialesRecibidos || []);
  fillChecks("apoyosNecesariosBox", "apoyosNecesarios", opts.apoyosNecesarios || []);
  fillRadios("activacionRealizadaBox", "activacionRealizada", opts.activacionRealizada || []);
  fillRadios("utilidadActivacionBox", "utilidadActivacion", opts.utilidadActivacion || []);
  fillChecks("redesSocialesBox", "redesSociales", opts.redesSociales || []);
  fillRadios("visitaWebBox", "visitaWeb", opts.visitaWeb || []);
  fillRadios("medioInfoBox", "medioInfo", opts.medioInfo || []);
  fillRadios("otroDistribuidorBox", "otroDistribuidor", opts.otroDistribuidor || []);
  fillComisiones();
  fillRadios("formatoPdvBox", "formatoPdv", opts.formatoPdv || []);
  fillRadios("entornoPdvBox", "entornoPdv", opts.entornoPdv || []);
  fillRadios("ubicacionCalleBox", "ubicacionCalle", opts.ubicacionCalle || []);
  fillChecks("materialesExhibidosBox", "materialesExhibidos", opts.materialesExhibidos || []);
  fillRadios("estadoMaterialesBox", "estadoMateriales", opts.estadoMateriales || []);
  fillRadios("visibilidadMensajesBox", "visibilidadMensajes", opts.visibilidadMensajes || []);
  fillRadios("vigenciaPromocionesBox", "vigenciaPromociones", opts.vigenciaPromociones || []);
  syncAll();
})();
