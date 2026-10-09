"""Makes the specimen ID photos used to measure OCR accuracy (scripts/ocr-accuracy.mjs).

Fictional people on plain cards that follow the label layout of a PhilSys
National ID (front and back), an LTO Driver's License and a Philippine
passport data page. Every card is marked "SPECIMEN - NOT A REAL ID".
Each card is saved twice: "clean" (a flat scan) and "photo" (tilted,
blurred, noisy, like a phone photo).

    python make_ids.py standard            # 4 people, DejaVu font
    python make_ids.py hard holdout        # 6 other people, another font,
                                           # smaller, darker, shadowed photos
    python make_ids.py unseen unseen       # 6 more people, a third font, milder
                                           # shadows — kept back from all tuning

Needs Python 3 with Pillow (pip install pillow) and the DejaVu and
Liberation fonts (Linux paths below; change F for Windows/macOS).
Writes the images and cases.json (expected values) into the folder.
"""
import json, math, os, random, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = sys.argv[1]
MODE = sys.argv[2] if len(sys.argv) > 2 else 'standard'
HOLDOUT = MODE == 'holdout'
UNSEEN = MODE == 'unseen'
if UNSEEN:
    F = '/usr/share/fonts/truetype/freefont/'
    REG, BOLD, MONO = 'FreeSans.ttf', 'FreeSansBold.ttf', 'FreeMono.ttf'
elif HOLDOUT:  # different font and people, harsher photos — never used to tune the parser
    F = '/usr/share/fonts/truetype/liberation/'
    REG, BOLD, MONO = 'LiberationSans-Regular.ttf', 'LiberationSans-Bold.ttf', 'LiberationMono-Regular.ttf'
else:
    F = '/usr/share/fonts/truetype/dejavu/'
    REG, BOLD, MONO = 'DejaVuSans.ttf', 'DejaVuSans-Bold.ttf', 'DejaVuSansMono.ttf'
def font(name, size): return ImageFont.truetype(F + name, size)

PEOPLE = [
    dict(key='p1', last='DELA CRUZ', given='JUAN', middle='SANTOS', dob=(1990, 1, 1), sex='M', civil='SINGLE',
         addr=['123 RIZAL STREET, BRGY. SAN JOSE,', 'AGOO, LA UNION, PHILIPPINES, 2504'], pob='AGOO, LA UNION'),
    dict(key='p2', last='REYES', given='MARIA CLARA', middle='GARCIA', dob=(1985, 11, 23), sex='F', civil='MARRIED',
         addr=['45 MABINI ST., POBLACION,', 'SAN FERNANDO CITY, LA UNION, 2500'], pob='SAN FERNANDO, LA UNION'),
    dict(key='p3', last='BAUTISTA', given='ROBERTO JR', middle='DE LEON', dob=(1978, 6, 15), sex='M', civil='WIDOWED',
         addr=['PUROK 3, BRGY. SAN NICOLAS NORTE,', 'AGOO, LA UNION, 2504'], pob='BAUANG, LA UNION'),
    dict(key='p4', last='VILLANUEVA', given='ANA', middle='LOPEZ', dob=(2001, 3, 9), sex='F', civil='SINGLE',
         addr=['BLK 4 LOT 12, SUNRISE VILLAGE,', 'BAUANG, LA UNION, 2501'], pob='BAUANG, LA UNION'),
]
if HOLDOUT:
    PEOPLE = [
        dict(key='h1', last='PEÑA', given='JOSE MIGUEL', middle='CASTAÑEDA', dob=(1969, 12, 31), sex='M', civil='MARRIED',
             addr=['78 QUEZON AVE., BRGY. CATBANGEN,', 'SAN FERNANDO CITY, LA UNION, 2500'], pob='NAGUILIAN, LA UNION'),
        dict(key='h2', last='DE LOS SANTOS', given='KRISTINE JOY', middle='MANGAOANG', dob=(1995, 7, 4), sex='F', civil='SINGLE',
             addr=['SITIO PAGDALAGAN, BRGY. SAN ANTONIO,', 'BAUANG, LA UNION, 2501'], pob='BAGUIO CITY'),
        dict(key='h3', last='OCAMPO', given='RICARDO III', middle='TAN', dob=(1982, 2, 28), sex='M', civil='SEPARATED',
             addr=['12 BONIFACIO ST., BRGY. SAN JOSE NORTE,', 'AGOO, LA UNION, 2504'], pob='AGOO, LA UNION'),
        dict(key='h4', last='GALANG', given='LOURDES', middle='ABAD', dob=(1958, 10, 10), sex='F', civil='WIDOWED',
             addr=['PUROK 6, BRGY. NAZARETH,', 'ARINGAY, LA UNION, 2503'], pob='ARINGAY, LA UNION'),
        dict(key='h5', last='SALAZAR', given='MARK ANTHONY', middle='DELA ROSA', dob=(1999, 5, 17), sex='M', civil='SINGLE',
             addr=['BLK 2 LOT 7 PHASE 1, VILLA GRACIA SUBD.,', 'STO. TOMAS, LA UNION, 2505'], pob='STO. TOMAS, LA UNION'),
        dict(key='h6', last='AQUINO', given='CARMELA', middle='VILLANUEVA', dob=(1988, 4, 2), sex='F', civil='MARRIED',
             addr=['234 NATIONAL HIGHWAY, BRGY. SAN NICOLAS SUR,', 'AGOO, LA UNION, 2504'], pob='DAGUPAN CITY'),
    ]
if UNSEEN:
    PEOPLE = [
        dict(key='u1', last='SAN JUAN', given='MA. THERESA', middle='DOMINGO', dob=(1976, 8, 19), sex='F', civil='MARRIED',
             addr=['56 ZAMORA ST., BRGY. 4,', 'SAN FERNANDO CITY, LA UNION, 2500'], pob='SAN FERNANDO, LA UNION'),
        dict(key='u2', last='IBAÑEZ', given='RAFAEL', middle='CORPUZ', dob=(1993, 11, 5), sex='M', civil='SINGLE',
             addr=['PUROK 2, BRGY. CONSOLACION,', 'AGOO, LA UNION, 2504'], pob='AGOO, LA UNION'),
        dict(key='u3', last='VALDEZ', given='ERNESTO SR', middle='RAMOS', dob=(1961, 1, 27), sex='M', civil='WIDOWED',
             addr=['89 MACARTHUR HIGHWAY, BRGY. SAN MIGUEL,', 'BAUANG, LA UNION, 2501'], pob='BAUANG, LA UNION'),
        dict(key='u4', last='DEL ROSARIO', given='JENNIFER', middle='ESTRADA', dob=(1990, 9, 30), sex='F', civil='SEPARATED',
             addr=['LOT 3 BLK 9, GREENHILLS SUBD.,', 'ROSARIO, LA UNION, 2506'], pob='SAN FABIAN, PANGASINAN'),
        dict(key='u5', last='TOLENTINO', given='ARVIN', middle='MACARAEG', dob=(2003, 2, 14), sex='M', civil='SINGLE',
             addr=['SITIO TALOGTOG, BRGY. CAPAS,', 'AGOO, LA UNION, 2504'], pob='AGOO, LA UNION'),
        dict(key='u6', last='CABRERA', given='GLORIA', middle='DELOS REYES', dob=(1955, 12, 8), sex='F', civil='MARRIED',
             addr=['22 GOMEZ ST., BRGY. SAN NICOLAS NORTE,', 'AGOO, LA UNION, 2504'], pob='CABA, LA UNION'),
    ]
MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER']

def card(tint):
    W, H = 1012, 638
    img = Image.new('RGB', (W, H), tint)
    d = ImageDraw.Draw(img)
    # guilloche-ish background lines
    for k in range(0, H, 9):
        pts = [(x, k + 4 * math.sin(x / 37 + k)) for x in range(0, W, 8)]
        d.line(pts, fill=tuple(max(0, c - 12) for c in tint), width=1)
    return img, d

def specimen(d, W, H):
    d.text((W - 330, H - 34), 'SPECIMEN - NOT A REAL ID', fill=(190, 40, 40), font=font(BOLD, 18))

def photo(d, x=40, y=150, w=230, h=290):
    d.rectangle([x, y, x + w, y + h], fill=(190, 190, 195), outline=(120, 120, 120))
    d.ellipse([x + 60, y + 40, x + w - 60, y + 160], fill=(150, 150, 155))
    d.rectangle([x + 40, y + 170, x + w - 40, y + h - 10], fill=(150, 150, 155))

def lab(d, xy, t, size=17): d.text(xy, t, fill=(70, 70, 80), font=font(REG, size))
def val(d, xy, t, size=26): d.text(xy, t, fill=(10, 10, 15), font=font(BOLD, size))

def philsys_front(p):
    img, d = card((236, 240, 248))
    d.text((300, 20), 'REPUBLIKA NG PILIPINAS', fill=(20, 40, 110), font=font(BOLD, 24))
    d.text((300, 50), 'Republic of the Philippines', fill=(20, 40, 110), font=font(REG, 18))
    d.text((300, 76), 'PAMBANSANG PAGKAKAKILANLAN', fill=(20, 40, 110), font=font(BOLD, 22))
    d.text((300, 104), 'Philippine Identification Card', fill=(20, 40, 110), font=font(REG, 18))
    photo(d)
    d.text((40, 540), '1234-5678-9012-3456', fill=(10, 10, 15), font=font(BOLD, 22))
    x, y = 300, 150
    for l, v in [('Apelyido/Last Name', p['last']), ('Mga Pangalan/Given Names', p['given']),
                 ('Gitnang Apelyido/Middle Name', p['middle'])]:
        lab(d, (x, y), l); val(d, (x, y + 20), v); y += 66
    yy, mm, dd = p['dob']
    lab(d, (x, y), 'Petsa ng Kapanganakan/Date of Birth'); val(d, (x, y + 20), f'{MONTHS[mm-1]} {dd:02d}, {yy}', 24); y += 64
    lab(d, (x, y), 'Tirahan/Address')
    for i, line in enumerate(p['addr']): val(d, (x, y + 20 + i * 28), line, 20)
    specimen(d, 1012, 638)
    return img

def philsys_back(p):
    img, d = card((236, 240, 248))
    x, y = 40, 40
    lab(d, (x, y), 'Araw ng pagkakaloob/Date of issue'); val(d, (x, y + 20), '15 MARCH 2023', 22); y += 70
    lab(d, (x, y), 'Kasarian/Sex'); val(d, (x, y + 20), 'MALE' if p['sex'] == 'M' else 'FEMALE', 22)
    lab(d, (x + 260, y), 'Uri ng Dugo/Blood Type'); val(d, (x + 260, y + 20), 'O+', 22); y += 70
    lab(d, (x, y), 'Kalagayang Sibil/Marital Status'); val(d, (x, y + 20), p['civil'], 22); y += 70
    lab(d, (x, y), 'Lugar ng Kapanganakan/Place of Birth'); val(d, (x, y + 20), p['pob'], 22)
    specimen(d, 1012, 638)
    d.rectangle([700, 60, 960, 320], fill=(30, 30, 30))  # stand-in for the QR code
    for i in range(0, 260, 20):
        for j in range(0, 260, 20):
            if (i * 7 + j * 3) % 3 == 0: d.rectangle([700 + i, 60 + j, 710 + i, 70 + j], fill=(240, 240, 240))
    return img

def drivers_license(p):
    img, d = card((240, 246, 238))
    for i, (t, s) in enumerate([('REPUBLIC OF THE PHILIPPINES', 20), ('DEPARTMENT OF TRANSPORTATION', 18),
                                 ('LAND TRANSPORTATION OFFICE', 24), ("DRIVER'S LICENSE", 26)]):
        d.text((300, 14 + i * 30), t, fill=(20, 80, 40), font=font(BOLD, s))
    photo(d, y=160)
    x, y = 300, 150
    lab(d, (x, y), 'Last Name, First Name, Middle Name')
    val(d, (x, y + 20), f"{p['last']}, {p['given']} {p['middle']}", 24); y += 62
    for lx, l in [(0, 'Nationality'), (130, 'Sex'), (200, 'Date of Birth'), (380, 'Weight (kg)'), (520, 'Height(m)')]:
        lab(d, (x + lx, y), l, 16)
    yy, mm, dd = p['dob']
    for lx, v in [(0, 'PHL'), (130, p['sex']), (200, f'{yy}/{mm:02d}/{dd:02d}'), (380, '62'), (520, '1.65')]:
        val(d, (x + lx, y + 20), v, 22)
    y += 62
    lab(d, (x, y), 'Address')
    val(d, (x, y + 20), ' '.join(p['addr']).replace(', PHILIPPINES', ''), 17); y += 62
    for lx, l in [(0, 'License No.'), (230, 'Expiration Date'), (430, 'Agency Code')]:
        lab(d, (x + lx, y), l, 16)
    for lx, v in [(0, 'A01-23-456789'), (230, '2030/01/01'), (430, 'A01')]:
        val(d, (x + lx, y + 20), v, 22)
    y += 62
    lab(d, (x, y), 'Blood Type', 16); lab(d, (x + 160, y), 'Eyes Color', 16)
    val(d, (x, y + 20), 'O+', 22); val(d, (x + 160, y + 20), 'BLACK', 22)
    specimen(d, 1012, 638)
    return img

def check_digit(s):
    w = [7, 3, 1]; t = 0
    for i, c in enumerate(s):
        v = 0 if c == '<' else int(c) if c.isdigit() else ord(c) - 55
        t += v * w[i % 3]
    return str(t % 10)

def passport(p):
    W, H = 1250, 880
    img = Image.new('RGB', (W, H), (243, 238, 246)); d = ImageDraw.Draw(img)
    for k in range(0, H, 11):
        d.line([(x, k + 3 * math.sin(x / 41 + k)) for x in range(0, W, 9)], fill=(232, 226, 236))
    d.text((340, 20), 'REPUBLIKA NG PILIPINAS / REPUBLIC OF THE PHILIPPINES', fill=(70, 20, 70), font=font(BOLD, 22))
    d.text((340, 52), 'PASAPORTE / PASSPORT', fill=(70, 20, 70), font=font(BOLD, 22))
    photo(d, x=40, y=110, w=270, h=340)
    x, y = 340, 100
    for lx, l in [(0, 'Uri/Type'), (150, 'Kodigo ng Bansa/Country Code'), (500, 'Pasaporte Blg/Passport No.')]: lab(d, (x + lx, y), l, 16)
    for lx, v in [(0, 'P'), (150, 'PHL'), (500, 'P1234567A')]: val(d, (x + lx, y + 20), v, 24)
    y += 64
    for l, v in [('Apelyido/Surname', p['last']), ('Pangalan/Given names', p['given']), ('Panggitnang apelyido/Middle name', p['middle'])]:
        lab(d, (x, y), l); val(d, (x, y + 20), v); y += 64
    yy, mm, dd = p['dob']
    lab(d, (x, y), 'Petsa ng kapanganakan/Date of birth'); lab(d, (x + 420, y), 'Kasarian/Sex')
    val(d, (x, y + 20), f'{dd:02d} {MONTHS[mm-1][:3]} {yy}', 24); val(d, (x + 420, y + 20), p['sex'], 24); y += 64
    lab(d, (x, y), 'Nasyonalidad/Nationality'); lab(d, (x + 420, y), 'Lugar ng kapanganakan/Place of birth')
    val(d, (x, y + 20), 'FILIPINO', 24); val(d, (x + 420, y + 20), p['pob'], 22); y += 64
    lab(d, (x, y), 'Petsa ng pagkakaloob/Date of issue'); lab(d, (x + 420, y), 'Valid until')
    val(d, (x, y + 20), '05 MAR 2020', 24); val(d, (x + 420, y + 20), '04 MAR 2030', 24)
    d.text((W - 330, 660), 'SPECIMEN - NOT A REAL ID', fill=(190, 40, 40), font=font(BOLD, 18))
    mrz = lambda name: name.replace('Ñ', 'N').replace('.', '').replace(' ', '<')
    surname = mrz(p['last']); given = mrz(p['given'])
    l1 = ('P<PHL' + surname + '<<' + given).ljust(44, '<')[:44]
    num = 'P1234567A'; dob = f'{yy % 100:02d}{mm:02d}{dd:02d}'; exp = '300304'
    body = num + check_digit(num) + 'PHL' + dob + check_digit(dob) + p['sex'] + exp + check_digit(exp)
    personal = '<' * 14
    body2 = body + personal + check_digit(personal)
    final = check_digit(num + check_digit(num) + dob + check_digit(dob) + exp + check_digit(exp) + personal + check_digit(personal))
    l2 = body2 + final
    assert len(l1) == 44 and len(l2) == 44, (len(l1), len(l2))
    d.rectangle([0, 700, W, H], fill=(250, 250, 250))
    d.text((40, 728), l1, fill=(10, 10, 10), font=font(MONO, 40))
    d.text((40, 790), l2, fill=(10, 10, 10), font=font(MONO, 40))
    return img

def phone_photo(img, seed):
    rnd = random.Random(seed)
    angle = rnd.choice([-3.5, -2.5, 2.4, 3.2] if HOLDOUT else [-2.8, -1.8, 1.6, 2.6] if UNSEEN else [-2.2, -1.4, 1.2, 2.0])
    bg = Image.new('RGB', (img.width + 160, img.height + 160), (95, 85, 70))
    bg.paste(img, (80, 80))
    out = bg.rotate(angle, resample=Image.BICUBIC, fillcolor=(95, 85, 70))
    scale = 0.66 if HOLDOUT else 0.72 if UNSEEN else 0.78
    out = out.resize((int(out.width * scale), int(out.height * scale)), Image.BILINEAR)
    out = out.filter(ImageFilter.GaussianBlur(0.9 if HOLDOUT else 0.8 if UNSEEN else 0.7))
    if HOLDOUT or UNSEEN:  # uneven lighting: darker toward one corner
        shade = Image.linear_gradient('L').rotate(rnd.choice([30, 120, 210, 300])).resize(out.size)
        dark = Image.eval(out, lambda v: int(v * (0.62 if HOLDOUT else 0.75)))
        out = Image.composite(dark, out, shade.point(lambda v: int(v * 0.8)))
    px = out.load()
    for _ in range(out.width * out.height // 60):
        x, y = rnd.randrange(out.width), rnd.randrange(out.height)
        c = px[x, y]; n = rnd.randint(-25, 25)
        px[x, y] = tuple(max(0, min(255, v + n)) for v in c)
    return out

truth = {}
makers = {'philsys_front': philsys_front, 'philsys_back': philsys_back, 'drivers_license': drivers_license, 'passport': passport}
for p in PEOPLE:
    for kind, make in makers.items():
        img = make(p)
        for cond in ['clean', 'photo']:
            name = f"{p['key']}_{kind}_{cond}.jpg"
            seed = sum(map(ord, name))
            (img if cond == 'clean' else phone_photo(img, seed)).save(os.path.join(OUT, name), quality=88 if cond == 'clean' else (45 if HOLDOUT else 50 if UNSEEN else 55))
    yy, mm, dd = p['dob']
    given, suffix = p['given'], None
    for raw, nice in [(' JR', 'Jr.'), (' SR', 'Sr.'), (' III', 'III')]:
        if given.endswith(raw): given, suffix = given[:-len(raw)], nice
    truth[p['key']] = dict(lastName=p['last'], firstName=given, middleName=p['middle'], suffix=suffix,
                           birthDate=f'{yy}-{mm:02d}-{dd:02d}', sex='Male' if p['sex'] == 'M' else 'Female',
                           nationality='Filipino', address=' '.join(p['addr']),
                           civilStatus={'SINGLE': 'Single', 'MARRIED': 'Married', 'WIDOWED': 'Widow/er', 'SEPARATED': 'Separated'}[p['civil']])
ON = {'philsys': ['lastName', 'firstName', 'middleName', 'suffix', 'birthDate', 'address', 'sex', 'civilStatus'],
      'drivers_license': ['lastName', 'firstName', 'middleName', 'suffix', 'birthDate', 'sex', 'nationality', 'address'],
      'passport': ['lastName', 'firstName', 'middleName', 'suffix', 'birthDate', 'sex', 'nationality']}
cases = []
for p in PEOPLE:
    t = truth[p['key']]
    for cond in ['clean', 'photo']:
        for id_type, files in [('philsys', ['philsys_front', 'philsys_back']), ('drivers_license', ['drivers_license']), ('passport', ['passport'])]:
            exp = {k: t[k] for k in ON[id_type]}
            if id_type == 'drivers_license': exp['address'] = exp['address'].replace(', PHILIPPINES', '')
            if id_type == 'philsys': exp['address'] = exp['address'].replace(', PHILIPPINES', '')
            cases.append({'name': f"{p['key']} {id_type} {cond}", 'condition': cond, 'idType': id_type,
                          'files': [f"{p['key']}_{f}_{cond}.jpg" for f in files], 'expected': exp})
json.dump({'note': 'Fictional people on specimen cards made by make_ids.py. Not real IDs.', 'cases': cases},
          open(os.path.join(OUT, 'cases.json'), 'w'), indent=1, ensure_ascii=False)
print(len(cases), 'test cases written to', OUT)
