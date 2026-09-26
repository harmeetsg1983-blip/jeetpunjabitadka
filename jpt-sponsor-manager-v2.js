async function mount(){
  const h=host();

  if(!h || document.getElementById('jptSponsorManager')) return;

  /*
    JPT SPONSOR ADS V2
    Controlled launcher:
    - Does not depend on .tabs visibility.
    - Does not depend on Master UI navigation.
    - Works on desktop and mobile.
    - Existing database RLS remains the security layer.
  */

  css();

  /* --------------------------------------------------
     CREATE VISIBLE SPONSOR ADS V2 LAUNCHER
  -------------------------------------------------- */

  function createSponsorLauncher(){

    if(document.getElementById('jptSponsorV2Launcher')){
      return;
    }

    const btn=document.createElement('button');

    btn.id='jptSponsorV2Launcher';
    btn.type='button';
    btn.textContent='📢 Sponsor Ads V2';

    btn.style.cssText=[
      'position:fixed',
      'left:12px',
      'right:12px',
      'bottom:82px',
      'z-index:2147483000',
      'height:46px',
      'border:1.5px solid #e8b82f',
      'border-radius:14px',
      'background:linear-gradient(135deg,#241b05,#080704)',
      'color:#f4d77a',
      'font-size:14px',
      'font-weight:900',
      'letter-spacing:.2px',
      'box-shadow:0 0 18px rgba(232,184,47,.25)',
      'cursor:pointer',
      'display:flex',
      'align-items:center',
      'justify-content:center'
    ].join(';');

    btn.addEventListener('click',function(){

      /*
        Open existing Settings panel.
        We do NOT replace showPanel().
      */

      if(typeof window.showPanel==='function'){
        window.showPanel('settings');
      }else{
        const settingsBtn=document.querySelector(
          '#jptMasterTopNav button[data-panel="settings"]'
        );

        if(settingsBtn){
          settingsBtn.click();
        }
      }

      /*
        Give the existing panel a moment to become active,
        then scroll directly to Sponsor Manager V2.
      */

      setTimeout(function(){

        const manager=document.getElementById(
          'jptSponsorManager'
        );

        if(manager){
          manager.scrollIntoView({
            behavior:'smooth',
            block:'start'
          );
        }

      },250);

    });

    document.body.appendChild(btn);
  }


  /* --------------------------------------------------
     BUILD SPONSOR MANAGER
  -------------------------------------------------- */

  const box=document.createElement('section');

  box.id='jptSponsorManager';

  box.innerHTML=`
    <div class="jpt-sm">

      <h3>✨ Sponsor Advertisement Manager V2</h3>

      <div class="sub">
        Central Sponsor Controls • Delivery Partner + Customer Tracking
        • Image Crop • Zoom • Drag • Schedule • Outlet Targeting
      </div>

      <div class="jpt-sm-tabs">

        <button
          id="jptSmDelivery"
          class="on"
          type="button">
          Delivery Partner
        </button>

        <button
          id="jptSmCustomer"
          type="button">
          Customer Tracking
        </button>

      </div>

      <div class="jpt-sm-grid">

        <div>
          <label>Sponsor Name</label>
          <input
            id="jptSmSponsor"
            placeholder="Sponsor / Brand">
        </div>

        <div>
          <label>Banner Title</label>
          <input
            id="jptSmTitle"
            placeholder="Optional title">
        </div>

      </div>

      <label>Banner Image</label>

      <input
        id="jptSmFile"
        type="file"
        accept="image/*">

      <div
        id="jptSmCrop"
        class="jpt-crop"
        style="display:none">

        <canvas id="jptSmCanvas"></canvas>

        <div class="jpt-crop-row">

          <button
            id="jptSmZoomOut"
            type="button">
            − Zoom
          </button>

          <button
            id="jptSmCenter"
            type="button">
            Center
          </button>

          <button
            id="jptSmZoomIn"
            type="button">
            ＋ Zoom
          </button>

        </div>

        <div
          class="jpt-sm-note"
          style="margin-top:6px">

          Drag the image inside the frame to position it.

        </div>

      </div>

      <div class="jpt-sm-grid">

        <div>

          <label>Target</label>

          <select id="jptSmTarget">

            <option value="all">
              All live users
            </option>

            <option value="outlet">
              Selected outlet
            </option>

          </select>

        </div>

        <div>

          <label>Sort Order</label>

          <input
            id="jptSmSort"
            type="number"
            value="0"
            min="0">

        </div>

      </div>

      <div
        id="jptSmOutletWrap"
        style="display:none">

        <label>Outlet</label>

        <select id="jptSmOutlet"></select>

      </div>

      <div class="jpt-sm-grid">

        <div>

          <label>Start (optional)</label>

          <input
            id="jptSmStart"
            type="datetime-local">

        </div>

        <div>

          <label>End (optional)</label>

          <input
            id="jptSmEnd"
            type="datetime-local">

        </div>

      </div>

      <button
        id="jptSmSave"
        class="jpt-sm-primary"
        type="button">

        ADD SPONSOR BANNER

      </button>

      <div
        id="jptSmMsg"
        class="jpt-sm-note">
      </div>

      <div class="jpt-sm-list">

        <b>Saved Banners</b>

        <div
          id="jptSmList"
          class="jpt-sm-note">
          Loading...
        </div>

      </div>

    </div>
  `;

  h.appendChild(box);


  /* --------------------------------------------------
     ELEMENT REFERENCES
  -------------------------------------------------- */

  const r={};

  [
    'jptSmDelivery',
    'jptSmCustomer',
    'jptSmSponsor',
    'jptSmTitle',
    'jptSmFile',
    'jptSmCrop',
    'jptSmCanvas',
    'jptSmZoomOut',
    'jptSmCenter',
    'jptSmZoomIn',
    'jptSmTarget',
    'jptSmOutletWrap',
    'jptSmOutlet',
    'jptSmSort',
    'jptSmStart',
    'jptSmEnd',
    'jptSmSave',
    'jptSmMsg',
    'jptSmList'
  ].forEach(id=>{
    r[id.replace('jptSm','').toLowerCase()] =
      document.getElementById(id);
  });


  /* --------------------------------------------------
     IMAGE CROPPER
  -------------------------------------------------- */

  let img=null;
  let scale=1;
  let ox=0;
  let oy=0;
  let drag=false;
  let lx=0;
  let ly=0;

  const canvas=r.canvas;
  const ctx=canvas.getContext('2d');

  function draw(){

    if(!img) return;

    const w=canvas.width;
    const h=canvas.height;

    ctx.fillStyle='#111';
    ctx.fillRect(0,0,w,h);

    const iw=img.width*scale;
    const ih=img.height*scale;

    ctx.drawImage(
      img,
      (w-iw)/2+ox,
      (h-ih)/2+oy,
      iw,
      ih
    );
  }

  function fit(){

    if(!img) return;

    const cw=900;
    const ch=330;

    canvas.width=cw;
    canvas.height=ch;

    scale=Math.max(
      cw/img.width,
      ch/img.height
    );

    ox=0;
    oy=0;

    draw();
  }

  r.file.onchange=()=>{

    const f=r.file.files?.[0];

    if(!f) return;

    const u=URL.createObjectURL(f);

    img=new Image();

    img.onload=()=>{

      fit();

      r.crop.style.display='block';

      draw();
    };

    img.src=u;
  };

  r.zoomIn.onclick=()=>{

    if(!img) return;

    scale*=1.12;

    draw();
  };

  r.zoomOut.onclick=()=>{

    if(!img) return;

    scale=Math.max(
      scale/1.12,
      0.05
    );

    draw();
  };

  r.center.onclick=()=>{

    if(!img) return;

    ox=0;
    oy=0;

    draw();
  };

  canvas.addEventListener(
    'pointerdown',
    e=>{

      if(!img) return;

      drag=true;

      lx=e.clientX;
      ly=e.clientY;

      canvas.setPointerCapture(
        e.pointerId
      );
    }
  );

  canvas.addEventListener(
    'pointermove',
    e=>{

      if(!drag) return;

      ox+=e.clientX-lx;
      oy+=e.clientY-ly;

      lx=e.clientX;
      ly=e.clientY;

      draw();
    }
  );

  canvas.addEventListener(
    'pointerup',
    ()=>{
      drag=false;
    }
  );


  function exportBlob(){

    return new Promise(
      (resolve,reject)=>{

        if(!img){

          reject(
            new Error(
              'Choose an image first.'
            )
          );

          return;
        }

        canvas.toBlob(
          b=>{
            if(b){
              resolve(b);
            }else{
              reject(
                new Error(
                  'Crop export failed.'
                )
              );
            }
          },
          'image/jpeg',
          .92
        );
      }
    );
  }


  /* --------------------------------------------------
     OUTLETS
  -------------------------------------------------- */

  async function fillOutlets(){

    await outlets({
      outlet:r.outlet
    });
  }

  await fillOutlets();


  r.target.onchange=()=>{

    r.outletwrap.style.display =
      r.target.value==='outlet'
        ? 'block'
        : 'none';
  };


  /* --------------------------------------------------
     MODE
  -------------------------------------------------- */

  let mode='delivery';

  function refreshMode(){

    r.delivery.classList.toggle(
      'on',
      mode==='delivery'
    );

    r.customer.classList.toggle(
      'on',
      mode==='customer'
    );

    refresh();
  }

  r.delivery.onclick=()=>{

    mode='delivery';

    refreshMode();
  };

  r.customer.onclick=()=>{

    mode='customer';

    refreshMode();
  };


  /* --------------------------------------------------
     LOAD SAVED BANNERS
  -------------------------------------------------- */

  async function refresh(){

    try{

      const table =
        mode==='delivery'
          ? DELIVERY_TABLE
          : CUSTOMER_TABLE;

      const rows=await load(table);

      r.list.innerHTML =
        rows.length
          ? rows.map(x=>`

              <div class="jpt-sm-item">

                <img
                  class="jpt-sm-thumb"
                  src="${esc(x.media_url)}">

                <div>

                  <b>
                    ${esc(
                      x.sponsor_name ||
                      x.title ||
                      'Sponsor'
                    )}
                  </b>

                  <div class="jpt-sm-note">

                    ${esc(x.title||'')}
                    ·
                    ${x.is_active?'ON':'OFF'}
                    · order
                    ${x.sort_order??0}

                  </div>

                  <span class="jpt-sm-chip">

                    ${
                      x.target_all_live
                        ? 'ALL LIVE'
                        : (x.outlet_ids||[]).join(', ')
                    }

                  </span>

                </div>

                <button
                  class="jpt-sm-danger"
                  data-id="${esc(x.id)}"
                  data-active="${x.is_active?'1':'0'}"
                  type="button">

                  ${
                    x.is_active
                      ? 'TURN OFF'
                      : 'TURN ON'
                  }

                </button>

              </div>

            `).join('')
          : 'No sponsor banners yet.';


      r.list
        .querySelectorAll(
          'button[data-id]'
        )
        .forEach(b=>{

          b.onclick=async()=>{

            const q=
              await sb()
                .from(table)
                .update({
                  is_active:
                    b.dataset.active!=='1'
                })
                .eq(
                  'id',
                  b.dataset.id
                );

            if(q.error){

              r.msg.textContent=
                q.error.message;

            }else{

              refresh();
            }
          };

        });

    }catch(e){

      r.list.textContent=
        e.message ||
        'Unable to load banners.';
    }
  }


  /* --------------------------------------------------
     SAVE SPONSOR
  -------------------------------------------------- */

  r.save.onclick=async()=>{

    const file=
      r.file.files?.[0];

    if(!file){

      r.msg.textContent=
        'Please choose a banner image.';

      return;
    }

    r.save.disabled=true;

    r.msg.textContent=
      'Cropping and uploading...';

    try{

      const blob=
        await exportBlob();

      const safe=
        new File(
          [blob],
          (file.name||'sponsor')+'.jpg',
          {type:'image/jpeg'}
        );

      const bucket=
        mode==='delivery'
          ? DELIVERY_BUCKET
          : CUSTOMER_BUCKET;

      const table=
        mode==='delivery'
          ? DELIVERY_TABLE
          : CUSTOMER_TABLE;

      const path=
        'sponsors/' +
        Date.now() +
        '-' +
        Math.random()
          .toString(36)
          .slice(2,9) +
        '.jpg';

      const up=
        await sb()
          .storage
          .from(bucket)
          .upload(
            path,
            safe,
            {
              upsert:false,
              contentType:'image/jpeg'
            }
          );

      if(up.error){
        throw up.error;
      }

      const url=
        sb()
          .storage
          .from(bucket)
          .getPublicUrl(path)
          .data
          .publicUrl;

      const targetAll=
        r.target.value==='all';

      const outlet=
        r.outlet.value ||
        currentOutlet();

      const user=
        await sb()
          .auth
          .getUser();

      const row={

        title:
          r.title.value.trim() ||
          r.sponsor.value.trim() ||
          'Sponsor Banner',

        sponsor_name:
          r.sponsor.value.trim(),

        media_type:
          'image',

        media_url:
          url,

        poster_url:
          url,

        target_all_live:
          targetAll,

        outlet_ids:
          targetAll
            ? null
            : [outlet],

        is_active:
          true,

        sort_order:
          Number(
            r.sort.value||0
          ),

        starts_at:
          r.start.value
            ? new Date(
                r.start.value
              ).toISOString()
            : null,

        ends_at:
          r.end.value
            ? new Date(
                r.end.value
              ).toISOString()
            : null,

        created_by:
          user.data.user?.id ||
          null
      };

      const ins=
        await sb()
          .from(table)
          .insert(row);

      if(ins.error){
        throw ins.error;
      }

      r.msg.textContent=
        'Banner added successfully.';

      r.file.value='';

      r.crop.style.display='none';

      await refresh();

    }catch(e){

      r.msg.textContent=
        e.message ||
        'Upload failed.';

    }finally{

      r.save.disabled=false;
    }
  };


  /* --------------------------------------------------
     SHOW LAUNCHER
  -------------------------------------------------- */

  createSponsorLauncher();

  await refresh();
}


/* --------------------------------------------------
   SPONSOR V2 BOOT
-------------------------------------------------- */

function boot(){

  let n=0;

  const t=setInterval(
    async()=>{

      try{

        await mount();

      }catch(e){

        console.warn(
          '[JPT Sponsor Manager V2]',
          e
        );
      }

      if(
        document.getElementById(
          'jptSponsorManager'
        ) &&
        document.getElementById(
          'jptSponsorV2Launcher'
        )
      ){

        clearInterval(t);

      }else if(++n>120){

        clearInterval(t);
      }

    },
    500
  );
}
  boot();

})();
