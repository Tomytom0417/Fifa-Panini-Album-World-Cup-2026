let monInventaire = JSON.parse(localStorage.getItem('inventairePanini26')) || {};
let carteEnAttente = null;
let carteAmiEnAttente = null;

// Initialisation au chargement
window.onload = () => {
    genererFiltresEquipes();
};

function changerOnglet(idOnglet) {
    document.querySelectorAll('section').forEach(sec => sec.classList.remove('actif'));
    document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('actif'));
    
    const onglet = document.getElementById(idOnglet);
    const bouton = document.getElementById('btn-' + idOnglet);
    
    if (onglet) onglet.classList.add('actif');
    if (bouton) bouton.classList.add('actif');

    if(idOnglet === 'inventaire') {
        calculerStats();
        afficherInventaire();
    } else if (idOnglet === 'echanges') {
        reinitialiserEchange();
    }
}

function sauvegarder() {
    localStorage.setItem('inventairePanini26', JSON.stringify(monInventaire));
    if(document.getElementById('inventaire').classList.contains('actif')) calculerStats();
}

// --- PARTIE OUVERTURE ---
function traiterOuverture() {
    let code = document.getElementById('code-ouverture').value.trim().toUpperCase().replace(/\s+/g, '');
    let msg = document.getElementById('message-ouverture');
    let conf = document.getElementById('zone-confirmation');

    if (!code) return;
    if (!albumPanini[code]) {
        msg.innerHTML = `<span style="color: red;">Code inconnu !</span>`;
        conf.style.display = "none";
        return;
    }

    carteEnAttente = code;
    let details = albumPanini[code];
    let statut = monInventaire[code] ? `<span style="color: red;">(Déjà ${monInventaire[code]} en stock)</span>` : `<span style="color: green;">(Nouvelle !)</span>`;
    
    document.getElementById('details-carte').innerHTML = `<strong>${code}</strong> : ${details.nom} | Page ${details.page} ${statut}`;
    msg.innerHTML = "";
    conf.style.display = "block";
}

function confirmerAjout() {
    if (!carteEnAttente) return;
    monInventaire[carteEnAttente] = (monInventaire[carteEnAttente] || 0) + 1;
    document.getElementById('message-ouverture').innerHTML = `<span style="color: green;">${carteEnAttente} ajoutée !</span>`;
    sauvegarder();
    annulerAjout();
}

function annulerAjout() {
    carteEnAttente = null;
    document.getElementById('zone-confirmation').style.display = "none";
    document.getElementById('code-ouverture').value = '';
}

// --- PARTIE INVENTAIRE & STATS ---
// MODIFICATION : On alimente les deux sélecteurs d'équipes au chargement
function genererFiltresEquipes() {
    let selectInv = document.getElementById('filtre-equipe');
    let selectDon = document.getElementById('filtre-don-equipe');
    if (!selectInv) return;
    
    let equipes = [...new Set(Object.values(albumPanini).map(c => c.equipe))];
    
    let htmlBuffer = '<option value="Toutes">Toutes les équipes</option>';
    equipes.forEach(eq => {
        htmlBuffer += `<option value="${eq}">${eq}</option>`;
    });
    
    selectInv.innerHTML = htmlBuffer;
    if (selectDon) selectDon.innerHTML = htmlBuffer; // Ajout pour l'onglet échange
}

function modifierInventaire(code, delta) {
    if (!monInventaire[code]) monInventaire[code] = 0;
    monInventaire[code] += delta;
    if (monInventaire[code] <= 0) delete monInventaire[code];
    sauvegarder();
    afficherInventaire();
}

function afficherInventaire() {
    let listeDiv = document.getElementById('liste-inventaire');
    if (!listeDiv) return;

    let filtreEquipe = document.getElementById('filtre-equipe').value;
    let filtreType = document.getElementById('filtre-type').value;
    
    let optNom = document.getElementById('opt-nom').checked;
    let optEquipe = document.getElementById('opt-equipe').checked;
    let optPage = document.getElementById('opt-page').checked;

    let htmlBuffer = ''; // On prépare la mémoire vive

    // On parcourt l'album complet pour garder l'ordre officiel
    for (let code in albumPanini) {
        let carte = albumPanini[code];
        let qte = monInventaire[code] || 0;

        // Étape des filtres
        if (filtreEquipe !== "Toutes" && carte.equipe !== filtreEquipe) continue;
        if (filtreType === "manquantes" && qte > 0) continue;
        if (filtreType === "possedees" && qte === 0) continue;
        if (filtreType === "doubles" && qte < 2) continue;

        // Construction des options d'affichage
        let infos = [];
        if (optNom) infos.push(carte.nom);
        if (optEquipe) infos.push(`<em>${carte.equipe}</em>`);
        if (optPage) infos.push(`(p.${carte.page})`);

        let couleur = qte === 0 ? '#999' : (qte > 1 ? '#d9534f' : '#28a745');
        
        // On remplit notre variable de stockage textuel
        htmlBuffer += `
            <div class="carte-item" style="border-left: 4px solid ${couleur}; opacity: ${qte === 0 ? '0.6' : '1'};">
                <div style="flex-grow: 1;">
                    <strong>${code}</strong> - ${infos.join(' | ')}
                </div>
                <div class="controles-qte">
                    <button onclick="modifierInventaire('${code}', -1)" ${qte === 0 ? 'disabled' : ''}>-</button>
                    <span style="display:inline-block; width: 25px; text-align:center; font-weight:bold; color: ${couleur};">${qte}</span>
                    <button onclick="modifierInventaire('${code}', 1)">+</button>
                </div>
            </div>
        `;
    }
    
    // On injecte TOUT d'un seul coup ici
    listeDiv.innerHTML = htmlBuffer;
}

function calculerStats() {
    let zoneStats = document.getElementById('zone-stats');
    if (!zoneStats) return;

    let totalAlbum = Object.keys(albumPanini).length;
    let uniquesPossedees = 0;
    let totalPhysique = 0;
    let uniquesEnDouble = 0;
    let totalDoubles = 0;

    for (let code in albumPanini) {
        let qte = monInventaire[code] || 0;
        if (qte > 0) {
            uniquesPossedees++;
            totalPhysique += qte;
            if (qte > 1) {
                uniquesEnDouble++;
                totalDoubles += (qte - 1);
            }
        }
    }

    let pctCompletion = ((uniquesPossedees / totalAlbum) * 100).toFixed(1);

    zoneStats.innerHTML = `
        <p><strong>Progression :</strong> ${uniquesPossedees} / ${totalAlbum} (${pctCompletion}%)</p>
        <p><strong>Cartes physiques totales en main :</strong> ${totalPhysique}</p>
        <p><strong>Modèles en double :</strong> ${uniquesEnDouble} / ${totalAlbum}</p>
        <p><strong>Volume total de vignettes à échanger :</strong> ${totalDoubles}</p>
    `;
}

// --- PARTIE ÉCHANGES ---
function verifierCarteAmi() {
    let code = document.getElementById('code-ami').value.trim().toUpperCase().replace(/\s+/g, '');
    let res = document.getElementById('resultat-ami');
    
    if (!albumPanini[code]) {
        res.innerHTML = `<span style="color: red;">Code inconnu.</span>`;
        return;
    }

    carteAmiEnAttente = code;
    let qte = monInventaire[code] || 0;

    if (qte === 0) {
        res.innerHTML = `<span style="color: green;">Super ! Tu n'as pas ${code}. C'est un bon échange.</span>`;
        preparerMesDoubles();
    } else {
        res.innerHTML = `<span style="color: orange;">Attention, tu as déjà ${code} (x${qte}).</span>`;
        preparerMesDoubles();
    }
}

// MODIFICATION : Initialisation propre à l'ouverture de l'étape 2
function preparerMesDoubles() {
    document.getElementById('zone-don').style.display = "block";
    
    // On réinitialise les filtres à l'état neutre à chaque nouvelle recherche d'ami
    document.getElementById('recherche-don-code').value = "";
    document.getElementById('filtre-don-equipe').value = "Toutes";
    document.getElementById('tri-don').value = "album";
    
    filtrerEtTrierMesDoubles();
}

// NOUVELLE FONCTION : Gestion croisée du tri, des filtres et de la recherche
function filtrerEtTrierMesDoubles() {
    let select = document.getElementById('select-mes-doubles');
    if (!select) return;

    // Capture des critères de l'utilisateur
    let saisie = document.getElementById('recherche-don-code').value.trim().toUpperCase().replace(/\s+/g, '');
    let filtreEquipe = document.getElementById('filtre-don-equipe').value;
    let optionTri = document.getElementById('tri-don').value;

    let listeFiltree = [];

    // 1. Filtrage (Boucle calquée sur l'ordre officiel du livre)
    for (let code in albumPanini) {
        let qte = monInventaire[code] || 0;
        
        if (qte > 1) { // On ne retient que les cartes en double
            let carte = albumPanini[code];

            // Filtre A : Recherche par texte/code
            if (saisie && !code.includes(saisie)) continue;

            // Filtre B : Sélection par équipe
            if (filtreEquipe !== "Toutes" && carte.equipe !== filtreEquipe) continue;

            // La carte passe les filtres, on l'ajoute à notre tableau temporaire
            listeFiltree.push({
                code: code,
                nom: carte.nom,
                equipe: carte.equipe,
                doublesDispos: qte - 1
            });
        }
    }

    // 2. Application du Tri
    if (optionTri === "quantite") {
        // Tri décroissant : On pousse en premier ceux qui ont le plus grand nombre de doubles dispo
        listeFiltree.sort((a, b) => b.doublesDispos - a.doublesDispos);
    }
    // Si l'option est "album", pas besoin de trier : notre boucle "for (let code in albumPanini)" l'a déjà fait nativement

    // 3. Rendu visuel dans le sélecteur
    let htmlBuffer = "";
    if (listeFiltree.length === 0) {
        select.innerHTML = `<option value="" disabled>Aucun double ne correspond.</option>`;
        document.querySelector('#zone-don button').disabled = true;
        return;
    }

    listeFiltree.forEach((carte, index) => {
        // Le '[Dispo: X]' indique clairement combien de fois on peut échanger cette carte
        let optionText = `${carte.code} - ${carte.nom} (${carte.equipe}) [Dispo: ${carte.doublesDispos}]`;
        
        // Par confort, on pré-sélectionne le premier élément de la liste
        let selected = index === 0 ? "selected" : "";
        
        htmlBuffer += `<option value="${carte.code}" ${selected}>${optionText}</option>`;
    });

    select.innerHTML = htmlBuffer;
    document.querySelector('#zone-don button').disabled = false;
}

function validerEchange() {
    let carteDonnee = document.getElementById('select-mes-doubles').value;
    if (!carteAmiEnAttente || !carteDonnee) return;

    monInventaire[carteAmiEnAttente] = (monInventaire[carteAmiEnAttente] || 0) + 1;
    monInventaire[carteDonnee]--;

    if (monInventaire[carteDonnee] <= 0) delete monInventaire[carteDonnee];

    sauvegarder();
    document.getElementById('message-echange').innerHTML = `<p style="color: green; font-weight: bold;">🤝 Échange réussi ! +${carteAmiEnAttente} / -${carteDonnee}</p>`;
    
    setTimeout(reinitialiserEchange, 2500);
}

function reinitialiserEchange() {
    carteAmiEnAttente = null;
    let codeAmi = document.getElementById('code-ami');
    if(codeAmi) codeAmi.value = "";
    
    let resAmi = document.getElementById('resultat-ami');
    if(resAmi) resAmi.innerHTML = "";
    
    let zoneDon = document.getElementById('zone-don');
    if(zoneDon) zoneDon.style.display = "none";
    
    let msgEchange = document.getElementById('message-echange');
    if(msgEchange) msgEchange.innerHTML = "";
}

// --- PARTIE SAUVEGARDE ET RESTAURATION ---

function exporterCollection() {
    let codeBox = document.getElementById('code-sauvegarde');
    let msg = document.getElementById('message-sauvegarde');
    
    // On transforme l'inventaire en une chaîne de texte compressée (JSON)
    let codeTexte = JSON.stringify(monInventaire);
    codeBox.value = codeTexte;
    
    // Sélection automatique du texte pour faciliter le copier-coller
    codeBox.select();
    codeBox.setSelectionRange(0, 99999); // Pour les téléphones portables
    
    msg.innerHTML = `<span style="color: #28a745;">Code généré et sélectionné ! Tu peux le copier.</span>`;
}

function importerCollection() {
    let codeBox = document.getElementById('code-sauvegarde');
    let msg = document.getElementById('message-sauvegarde');
    let texteBrut = codeBox.value.trim();
    
    if (texteBrut === "") {
        msg.innerHTML = `<span style="color: #d9534f;">Erreur : Colle d'abord un code dans la zone de texte.</span>`;
        return;
    }
    
    try {
        // On tente de décoder le texte
        let nouvelInventaire = JSON.parse(texteBrut);
        
        // Vérification de sécurité pour s'assurer que c'est un format valide
        if (typeof nouvelInventaire === 'object' && nouvelInventaire !== null) {
            
            // Alerte de confirmation
            if (confirm("⚠️ Attention : Importer ce code va ÉCRASER et remplacer ta collection actuelle. Es-tu sûr de vouloir continuer ?")) {
                monInventaire = nouvelInventaire;
                
                // On applique les changements partout
                sauvegarder();
                afficherInventaire();
                calculerStats();
                
                msg.innerHTML = `<span style="color: #28a745;">Collection restaurée avec succès ! 🎉</span>`;
                codeBox.value = ""; // On vide la zone de texte
            }
        } else {
            msg.innerHTML = `<span style="color: #d9534f;">Code invalide : le format n'est pas correct.</span>`;
        }
    } catch (e) {
        // Si le JSON est mal formé ou qu'un caractère a été oublié lors du copier-coller
        msg.innerHTML = `<span style="color: #d9534f;">Code corrompu ou incomplet. Vérifie ton copier-coller.</span>`;
    }
}