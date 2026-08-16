/* ============================================================
   Fit For Life — Exercise Database
   ------------------------------------------------------------
   Every exercise is an object:
   {
     id:    unique string id
     n:     display name
     m:     target muscles (first = primary focus)
     eq:    equipment tier -> 'gym'  (commercial gym machines/barbells)
                              'min'  (home / minimal: dumbbells, bands)
                              'body' (no equipment at all)
     t:     type -> 'compound' | 'isolation' | 'core' | 'cardio' | 'mobility' | 'recovery'
     v:     YouTube search query used for the embedded demo video
     cues:  short coaching cues (shown under the video)
     preg:  true if safe during pregnancy (with listed caution)
     post:  true if safe early postpartum / core-restore friendly
     note:  optional safety note shown in the card
   }
   Equipment tiers cascade: gym users see gym+min+body,
   minimal users see min+body, no-equipment users see body only.
   ============================================================ */

const EXERCISES = [
  /* ---------------- CHEST ---------------- */
  { id:'bb-bench', n:'Barbell Bench Press', m:['Chest','Triceps','Front Delts'], eq:'gym', t:'compound', v:'barbell bench press proper form tutorial', vid:'hWbUlkb5Ms4', cues:['Feet planted, slight arch, shoulder blades pinched','Lower bar to mid-chest with control','Press up and slightly back toward the rack'] },
  { id:'incline-db-press', n:'Incline Dumbbell Press', m:['Upper Chest','Front Delts','Triceps'], eq:'min', t:'compound', v:'incline dumbbell press form', vid:'8fXfwG4ftaQ', cues:['Bench at 30–45°','Lower dumbbells to chest line','Press up without clanking the weights'] },
  { id:'cable-fly', n:'Cable Chest Fly', m:['Chest'], eq:'gym', t:'isolation', v:'cable chest fly form', vid:'I-Ue34qLxc4', cues:['Slight forward lean, soft elbows','Hug a barrel — squeeze at the middle','Slow 3-second return'] },
  { id:'machine-chest-press', n:'Machine Chest Press', m:['Chest','Triceps'], eq:'gym', t:'compound', v:'machine chest press form', vid:'Qu7-ceCvq7w', cues:['Handles at mid-chest height','Press without locking elbows hard','Control the negative'] },
  { id:'pec-deck', n:'Pec Deck Fly', m:['Chest'], eq:'gym', t:'isolation', v:'pec deck machine form', vid:'a9vQ_hwIksU', cues:['Elbows slightly below shoulders','Squeeze 1 second at the front','Never let the stack slam'] },
  { id:'dips-chest', n:'Chest Dips', m:['Lower Chest','Triceps'], eq:'gym', t:'compound', v:'chest dips form tutorial', vid:'ci5tcFgIntI', cues:['Lean torso forward ~30°','Lower until upper arm is parallel','Drive up through the palms'] },
  { id:'db-floor-press', n:'Dumbbell Floor Press', m:['Chest','Triceps'], eq:'min', t:'compound', v:'dumbbell floor press form', vid:'UBmpZ7l5Nlk', cues:['Lie on floor, knees bent','Elbows touch floor gently, then press','Great shoulder-friendly press'] },
  { id:'db-fly', n:'Dumbbell Fly', m:['Chest'], eq:'min', t:'isolation', v:'dumbbell chest fly form', vid:'rk8YayRoTRQ', cues:['Soft bend in elbows the whole time','Stretch only to shoulder depth','Squeeze chest to bring arms up'] },
  { id:'band-chest-press', n:'Band Chest Press', m:['Chest','Triceps'], eq:'min', t:'compound', v:'resistance band chest press', vid:'T0UJ0W-_yIE', cues:['Anchor band behind you at chest height','Press straight forward','Slow return keeps tension'] , preg:true, post:true },
  { id:'pushup', n:'Push-Up', m:['Chest','Triceps','Core'], eq:'body', t:'compound', v:'perfect push up form', vid:'IODxDxX7oi4', cues:['Body one straight line','Elbows ~45° from torso','Chest to an inch above the floor'] },
  { id:'incline-pushup', n:'Incline Push-Up', m:['Chest','Triceps','Core'], eq:'body', t:'compound', v:'incline push up form', vid:'cfns5VDVVvk', cues:['Hands on bench / counter / wall','The higher the hands, the easier','Keep hips in line with shoulders'], preg:true, post:true, note:'During pregnancy use a wall or high counter.' },
  { id:'decline-pushup', n:'Decline Push-Up', m:['Upper Chest','Front Delts'], eq:'body', t:'compound', v:'decline push up form', vid:'dcV-ATSeryA', cues:['Feet elevated on a chair/step','Hands slightly ahead of shoulders','Control the descent'] },
  { id:'wide-pushup', n:'Wide-Grip Push-Up', m:['Chest'], eq:'body', t:'compound', v:'wide push up form', vid:'TEGkpxBvU_Y', cues:['Hands 1.5× shoulder width','Elbows track over wrists','Squeeze chest at the top'] },

  /* ---------------- BACK ---------------- */
  { id:'deadlift', n:'Conventional Deadlift', m:['Back','Glutes','Hamstrings'], eq:'gym', t:'compound', v:'deadlift proper form tutorial', vid:'ZaTM37cfiDs', cues:['Bar over mid-foot, hinge to grip','Flat back, chest proud','Push the floor away, stand tall'] },
  { id:'lat-pulldown', n:'Lat Pulldown', m:['Lats','Biceps'], eq:'gym', t:'compound', v:'lat pulldown proper form', vid:'bNmvKpJSWKM', cues:['Grip slightly wider than shoulders','Pull bar to upper chest','Think elbows into back pockets'] },
  { id:'cable-row', n:'Seated Cable Row', m:['Mid Back','Lats','Biceps'], eq:'gym', t:'compound', v:'seated cable row form', vid:'8QuMq1GMMng', cues:['Tall chest, neutral spine','Pull handle to belly button','Squeeze shoulder blades together'] },
  { id:'bb-row', n:'Barbell Bent-Over Row', m:['Back','Lats','Biceps'], eq:'gym', t:'compound', v:'barbell bent over row form', vid:'qXrTDQG1oUQ', cues:['Hinge to ~45°','Row bar to lower ribs','No jerking — strict pulls'] },
  { id:'tbar-row', n:'T-Bar Row', m:['Mid Back','Lats'], eq:'gym', t:'compound', v:'t bar row form', vid:'8pR3JoZ0iBU', cues:['Chest up, core braced','Drive elbows back and up','Full stretch at the bottom'] },
  { id:'pullup', n:'Pull-Up', m:['Lats','Biceps','Core'], eq:'gym', t:'compound', v:'pull up proper form', vid:'OEXosPwzFdc', cues:['Start from a dead hang','Chin over the bar','Use assistance band/machine if needed'] },
  { id:'straight-arm-pd', n:'Straight-Arm Pulldown', m:['Lats'], eq:'gym', t:'isolation', v:'straight arm pulldown form', vid:'hAMcfubonDc', cues:['Arms nearly straight','Sweep the bar to your thighs','Feel the lats stretch at the top'] },
  { id:'db-row', n:'One-Arm Dumbbell Row', m:['Lats','Mid Back','Biceps'], eq:'min', t:'compound', v:'one arm dumbbell row form', vid:'gfUg6qWohTk', cues:['Hand + knee on bench, flat back','Row to your hip, not your armpit','Pause 1 second at the top'], preg:true, post:true, note:'During pregnancy keep the weight light-moderate and back supported.' },
  { id:'band-row', n:'Seated Band Row', m:['Mid Back','Lats','Biceps'], eq:'min', t:'compound', v:'seated resistance band row', vid:'bBpK36TAQww', cues:['Loop band around feet','Tall spine, pull to ribs','Squeeze blades, slow release'], preg:true, post:true },
  { id:'db-pullover', n:'Dumbbell Pullover', m:['Lats','Chest'], eq:'min', t:'isolation', v:'dumbbell pullover form', vid:'Datv2L6t3-4', cues:['Upper back on bench','Lower dumbbell behind head with straight-ish arms','Pull back over the chest'] },
  { id:'superman', n:'Superman Hold', m:['Lower Back','Glutes'], eq:'body', t:'core', v:'superman exercise form', vid:'nuKDHrBlpFs', cues:['Lift arms and legs together','Squeeze glutes, look down','Hold 2–3 seconds per rep'] },
  { id:'towel-row', n:'Doorway Towel Row', m:['Back','Biceps'], eq:'body', t:'compound', v:'towel door row exercise', vid:'FVxT8QuAU-0', cues:['Towel around a sturdy handle/post','Lean back, body straight','Row chest to hands'] },
  { id:'prone-ytw', n:'Prone Y-T-W Raises', m:['Upper Back','Rear Delts'], eq:'body', t:'isolation', v:'prone Y T W exercise shoulder', vid:'QdGTI4Lshg4', cues:['Lie face down','Lift arms into Y, then T, then W','Thumbs up, squeeze the blades'], post:true },
  { id:'reverse-snow-angel', n:'Reverse Snow Angel', m:['Upper Back','Rear Delts'], eq:'body', t:'isolation', v:'reverse snow angel exercise', vid:'R4iO4gXC_TY', cues:['Face down, arms sweep floor-free','Slow, wide arcs','Keep neck relaxed'], post:true },

  /* ---------------- SHOULDERS ---------------- */
  { id:'ohp', n:'Overhead Barbell Press', m:['Shoulders','Triceps','Core'], eq:'gym', t:'compound', v:'overhead press proper form', vid:'zoN5EH50Dro', cues:['Squeeze glutes, ribs down','Bar path straight up','Head "through the window" at the top'] },
  { id:'db-shoulder-press', n:'Seated Dumbbell Shoulder Press', m:['Shoulders','Triceps'], eq:'min', t:'compound', v:'seated dumbbell shoulder press form', vid:'k6tzKisR3NY', cues:['Back supported, feet planted','Press up and slightly in','Lower to ear level'], preg:true, note:'During pregnancy: seated, light weight, stop before fatigue.' },
  { id:'lateral-raise', n:'Dumbbell Lateral Raise', m:['Side Delts'], eq:'min', t:'isolation', v:'dumbbell lateral raise form', vid:'Kl3LEzQ5Zqs', cues:['Lead with the elbows','Raise to shoulder height only','Pour-the-jug wrist angle'], preg:true, post:true },
  { id:'cable-lateral', n:'Cable Lateral Raise', m:['Side Delts'], eq:'gym', t:'isolation', v:'cable lateral raise form', vid:'f_OGBg2KxgY', cues:['Cable behind the body','Constant tension — no swinging','Control the way down'] },
  { id:'face-pull', n:'Cable Face Pull', m:['Rear Delts','Upper Back'], eq:'gym', t:'isolation', v:'cable face pull form', vid:'IeOqdw9WI90', cues:['Rope at upper-chest height','Pull to your eyebrows','Thumbs point behind you at the end'] },
  { id:'band-face-pull', n:'Band Face Pull', m:['Rear Delts','Upper Back'], eq:'min', t:'isolation', v:'resistance band face pull', vid:'CSP7YpPv3ds', cues:['Anchor at face height','Pull apart and toward eyes','Squeeze rear delts 1 second'], preg:true, post:true },
  { id:'arnold-press', n:'Arnold Press', m:['Shoulders','Triceps'], eq:'min', t:'compound', v:'arnold press dumbbell form', vid:'AjB-UXErljM', cues:['Start palms facing you','Rotate out as you press','Full-delt coverage in one move'] },
  { id:'rear-delt-fly', n:'Rear Delt Machine Fly', m:['Rear Delts','Upper Back'], eq:'gym', t:'isolation', v:'reverse pec deck rear delt fly form', vid:'O2J8Qs7Wl3U', cues:['Chest on the pad','Arms sweep back, soft elbows','Pause at the rear'] },
  { id:'pike-pushup', n:'Pike Push-Up', m:['Shoulders','Triceps'], eq:'body', t:'compound', v:'pike push up form', vid:'89-8waE2XKI', cues:['Hips high, body an inverted V','Lower crown of head toward floor','Press back to the V'] },
  { id:'wall-handstand', n:'Wall Handstand Hold', m:['Shoulders','Core'], eq:'body', t:'compound', v:'wall handstand hold beginner', vid:'5kalrTkvm-8', cues:['Kick up with control','Push tall through the shoulders','Start with 10–20s holds'] },
  { id:'db-front-raise', n:'Dumbbell Front Raise', m:['Front Delts'], eq:'min', t:'isolation', v:'dumbbell front raise form', vid:'h9xfpTrAvkE', cues:['Raise to eye level','Alternate arms to stay strict','No torso swing'], preg:true, post:true },

  /* ---------------- BICEPS ---------------- */
  { id:'bb-curl', n:'Barbell Curl', m:['Biceps'], eq:'gym', t:'isolation', v:'barbell curl proper form', vid:'54x2WF1_Suc', cues:['Elbows pinned to sides','Curl without leaning back','Lower for a slow 3 count'] },
  { id:'cable-curl', n:'Cable Curl', m:['Biceps'], eq:'gym', t:'isolation', v:'cable bicep curl form', vid:'CrbTqNOlFgE', cues:['Constant tension top to bottom','Squeeze hard at the top','Wrists stay neutral'] },
  { id:'preacher-curl', n:'Preacher Curl', m:['Biceps'], eq:'gym', t:'isolation', v:'preacher curl form', vid:'9WDQqgiwQEY', cues:['Armpits snug on the pad','Never fully slam the stretch','Strict, no shoulder help'] },
  { id:'incline-db-curl', n:'Incline Dumbbell Curl', m:['Biceps'], eq:'min', t:'isolation', v:'incline dumbbell curl form', vid:'uCUaRFlA9vE', cues:['Bench at 45–60°','Arms hang behind torso for a deep stretch','Curl without moving the elbows'] },
  { id:'db-curl', n:'Dumbbell Curl', m:['Biceps'], eq:'min', t:'isolation', v:'dumbbell bicep curl form', vid:'MKWBV29S6c0', cues:['Palms up, elbows glued to ribs','Full range: straight arm to full squeeze','No swinging'], preg:true, post:true },
  { id:'hammer-curl', n:'Hammer Curl', m:['Biceps','Forearms'], eq:'min', t:'isolation', v:'hammer curl form', vid:'lmIo_gVE8T4', cues:['Neutral (thumbs-up) grip','Builds the arm "thickness"','Control both directions'], preg:true, post:true },
  { id:'band-curl', n:'Band Curl', m:['Biceps'], eq:'min', t:'isolation', v:'resistance band bicep curl', vid:'20xtfGZ37nw', cues:['Stand on the band','Curl to shoulders','Slow negative — bands love to snap back'], preg:true, post:true },
  { id:'chinup', n:'Chin-Up', m:['Biceps','Lats'], eq:'gym', t:'compound', v:'chin up proper form', vid:'Oi3bW9nQmGI', cues:['Palms facing you','Pull chin over the bar','Lower with full control'] },
  { id:'towel-curl', n:'Isometric Towel Curl', m:['Biceps'], eq:'body', t:'isolation', v:'towel isometric bicep curl', vid:'9YrTANkzU4U', cues:['Step on a towel, curl against it','Pull as hard as possible 10–20s','Rest and repeat'] },

  /* ---------------- TRICEPS ---------------- */
  { id:'pushdown', n:'Cable Triceps Pushdown', m:['Triceps'], eq:'gym', t:'isolation', v:'tricep pushdown form', vid:'1FjkhpZsaxc', cues:['Elbows pinned at sides','Push to full lockout','Let the bar rise only to chest height'] },
  { id:'skull-crusher', n:'EZ-Bar Skull Crusher', m:['Triceps'], eq:'gym', t:'isolation', v:'skull crusher form', vid:'zR9gty7LUxE', cues:['Lower bar to hairline','Elbows stay narrow','Press back to the ceiling'] },
  { id:'oh-cable-ext', n:'Overhead Cable Extension', m:['Triceps'], eq:'gym', t:'isolation', v:'overhead cable tricep extension form', vid:'9Ark9S11uXw', cues:['Face away from the stack','Deep stretch behind the head','Extend to full lockout'] },
  { id:'cgbp', n:'Close-Grip Bench Press', m:['Triceps','Chest'], eq:'gym', t:'compound', v:'close grip bench press form', vid:'xXd7sddHGa0', cues:['Hands shoulder-width','Elbows tucked to sides','Bar to lower chest'] },
  { id:'db-oh-ext', n:'Dumbbell Overhead Extension', m:['Triceps'], eq:'min', t:'isolation', v:'dumbbell overhead tricep extension form', vid:'b_r_LW4HEcM', cues:['Both hands cup one dumbbell','Lower behind head, elbows narrow','Full stretch, full lockout'], preg:true, post:true },
  { id:'db-kickback', n:'Dumbbell Kickback', m:['Triceps'], eq:'min', t:'isolation', v:'tricep kickback form', vid:'WhBxKbe1-NU', cues:['Torso parallel, elbow high','Extend to a straight arm','Pause at lockout'], preg:true, post:true },
  { id:'band-pushdown', n:'Band Pushdown', m:['Triceps'], eq:'min', t:'isolation', v:'resistance band tricep pushdown', vid:'PtHlGbiCglY', cues:['Anchor band overhead (door)','Elbows glued to sides','Slow controlled return'], preg:true, post:true },
  { id:'diamond-pushup', n:'Diamond Push-Up', m:['Triceps','Chest'], eq:'body', t:'compound', v:'diamond push up form', vid:'PPTj-MW2tcs', cues:['Thumbs + index fingers form a diamond','Elbows brush the ribs','Drop to knees to scale'] },
  { id:'bench-dip', n:'Bench Dip', m:['Triceps'], eq:'body', t:'compound', v:'bench dips form', vid:'4ua3MzaU0QU', cues:['Hands on chair/bench behind you','Hips graze the bench edge','Bend elbows to 90°, press up'] },

  /* ---------------- QUADS ---------------- */
  { id:'back-squat', n:'Barbell Back Squat', m:['Quads','Glutes','Core'], eq:'gym', t:'compound', v:'barbell back squat proper form', vid:'dW3zj79xfrc', cues:['Bar on traps, brace hard','Sit down between your heels','Drive up through mid-foot'] },
  { id:'leg-press', n:'Leg Press', m:['Quads','Glutes'], eq:'gym', t:'compound', v:'leg press proper form', vid:'nDh_BlnLCGc', cues:['Feet shoulder-width mid-platform','Lower to 90° knee bend','Never lock knees harshly'] },
  { id:'leg-extension', n:'Leg Extension', m:['Quads'], eq:'gym', t:'isolation', v:'leg extension machine form', vid:'uM86QE59Tgc', cues:['Pad on lower shin','Squeeze 1 second at the top','Lower slow — no slamming'] },
  { id:'hack-squat', n:'Hack Squat', m:['Quads','Glutes'], eq:'gym', t:'compound', v:'hack squat machine form', vid:'g9i05umL5vc', cues:['Back flat on the pad','Deep controlled descent','Push through whole foot'] },
  { id:'front-squat', n:'Barbell Front Squat', m:['Quads','Core','Glutes'], eq:'gym', t:'compound', v:'front squat form tutorial', vid:'_qv0m3tPd3s', cues:['Elbows high, bar on front delts','Stay upright','Quad-dominant king'] },
  { id:'goblet-squat', n:'Goblet Squat', m:['Quads','Glutes','Core'], eq:'min', t:'compound', v:'goblet squat form', vid:'lRYBbchqxtI', cues:['Hold dumbbell at your chest','Elbows slide inside knees','Tall chest all the way'], preg:true, post:true, note:'During pregnancy: light weight, wide stance, squat to a comfortable depth.' },
  { id:'db-lunge', n:'Dumbbell Walking Lunge', m:['Quads','Glutes'], eq:'min', t:'compound', v:'dumbbell walking lunge form', vid:'I34ysEkPK7w', cues:['Long stride, torso tall','Back knee kisses the floor','Push through the front heel'] },
  { id:'db-stepup', n:'Dumbbell Step-Up', m:['Quads','Glutes'], eq:'min', t:'compound', v:'dumbbell step up form', vid:'7AtIjR-QqVA', cues:['Whole foot on the box','Drive through the top leg only','Control the way down'] },
  { id:'bulgarian', n:'Bulgarian Split Squat', m:['Quads','Glutes'], eq:'min', t:'compound', v:'bulgarian split squat form', vid:'hiLF_pF3EJM', cues:['Rear foot on bench','Front shin near vertical','Brutal and worth it'] },
  { id:'bw-squat', n:'Bodyweight Squat', m:['Quads','Glutes'], eq:'body', t:'compound', v:'bodyweight squat perfect form', vid:'n_xLyzPEX7A', cues:['Feet shoulder-width, toes slightly out','Hips back and down','Chest proud, heels down'], preg:true, post:true, note:'During pregnancy: hold a counter/chair for balance if needed.' },
  { id:'split-squat', n:'Split Squat', m:['Quads','Glutes'], eq:'body', t:'compound', v:'split squat bodyweight form', vid:'Ms7aIhDm0uc', cues:['Staggered stance, hips square','Drop the back knee straight down','Front heel stays planted'], post:true },
  { id:'wall-sit', n:'Wall Sit', m:['Quads'], eq:'body', t:'isolation', v:'wall sit exercise form', vid:'cWTZ8Am1Ee0', cues:['Thighs parallel to floor','Back flat on the wall','Breathe — do not hold your breath'], preg:true, note:'During pregnancy keep holds short (15–20s) and breathe steadily.' },
  { id:'jump-squat', n:'Jump Squat', m:['Quads','Glutes','Cardio'], eq:'body', t:'cardio', v:'jump squat form', vid:'h5TmdMMtIT4', cues:['Quarter-squat, explode up','Land soft like a ninja','Reset each rep'] },
  { id:'reverse-lunge', n:'Reverse Lunge', m:['Quads','Glutes'], eq:'body', t:'compound', v:'reverse lunge form', vid:'xrPteyQLGAo', cues:['Step back, not forward — easier on knees','90/90 at both knees','Push through the front foot'], preg:true, post:true, note:'During pregnancy: hold support and shorten the step.' },
  { id:'stepup-bw', n:'Step-Up (Bodyweight)', m:['Quads','Glutes'], eq:'body', t:'compound', v:'step up exercise form', vid:'wfhXnLILqdk', cues:['Use stairs or a sturdy step','Slow 3-second lowering','Alternate legs'], preg:true, post:true },

  /* ---------------- HAMSTRINGS ---------------- */
  { id:'rdl', n:'Barbell Romanian Deadlift', m:['Hamstrings','Glutes','Lower Back'], eq:'gym', t:'compound', v:'romanian deadlift proper form', vid:'5rIqP63yWFg', cues:['Soft knees, hips travel back','Bar slides down the thighs','Stop at the hamstring stretch, stand tall'] },
  { id:'lying-leg-curl', n:'Lying Leg Curl', m:['Hamstrings'], eq:'gym', t:'isolation', v:'lying leg curl machine form', vid:'d6sg829PgNs', cues:['Hips pressed into the pad','Curl heels to glutes','3-second negative'] },
  { id:'seated-leg-curl', n:'Seated Leg Curl', m:['Hamstrings'], eq:'gym', t:'isolation', v:'seated leg curl machine form', vid:'xdbEG3xGLI8', cues:['Thigh pad locked down','Full squeeze at the bottom','Slow release'] },
  { id:'good-morning', n:'Barbell Good Morning', m:['Hamstrings','Lower Back','Glutes'], eq:'gym', t:'compound', v:'barbell good morning form', vid:'5DonmXxz6Qk', cues:['Light weight, hinge at hips','Flat back always','Feel hamstrings load, then stand'] },
  { id:'db-rdl', n:'Dumbbell Romanian Deadlift', m:['Hamstrings','Glutes'], eq:'min', t:'compound', v:'dumbbell romanian deadlift form', vid:'hQgFixeXdZo', cues:['Dumbbells brush the legs','Hips back, shins vertical','Squeeze glutes to finish'], post:true },
  { id:'sl-rdl', n:'Single-Leg Dumbbell RDL', m:['Hamstrings','Glutes','Core'], eq:'min', t:'compound', v:'single leg romanian deadlift form', vid:'R_fJ6H3FlVw', cues:['Hips stay square to floor','Back leg = counterbalance','Light weight, perfect balance'] },
  { id:'band-leg-curl', n:'Band Leg Curl', m:['Hamstrings'], eq:'min', t:'isolation', v:'resistance band leg curl standing', vid:'erpy11GrhsE', cues:['Anchor band low','Curl heel to glute','Squeeze and slow return'], preg:true, post:true },
  { id:'slider-curl', n:'Sliding Leg Curl', m:['Hamstrings','Glutes','Core'], eq:'body', t:'compound', v:'sliding leg curl towel form', vid:'hDZFKJT6nvM', cues:['Heels on towel/sliders','Bridge up, slide heels out and in','Hips stay high the whole set'] },
  { id:'sl-hinge', n:'Single-Leg Hip Hinge', m:['Hamstrings','Glutes','Balance'], eq:'body', t:'compound', v:'single leg hip hinge bodyweight', vid:'tX_0Pas9iNI', cues:['Reach hands to the floor as leg sweeps back','Square hips','Slow and controlled'], post:true },

  /* ---------------- GLUTES ---------------- */
  { id:'hip-thrust', n:'Barbell Hip Thrust', m:['Glutes','Hamstrings'], eq:'gym', t:'compound', v:'barbell hip thrust form', vid:'L1qG25DhAk4', cues:['Upper back on bench, bar on hips','Chin tucked, ribs down','Full lockout + 1s squeeze'] },
  { id:'cable-kickback', n:'Cable Glute Kickback', m:['Glutes'], eq:'gym', t:'isolation', v:'cable glute kickback form', vid:'n-cgsNePyFo', cues:['Kick back and slightly up','Squeeze at full extension','No lower-back arching'] },
  { id:'abduction-machine', n:'Hip Abduction Machine', m:['Glute Medius'], eq:'gym', t:'isolation', v:'hip abduction machine form', vid:'tu4o4quPv2k', cues:['Lean slightly forward for upper glutes','Pause at the widest point','Control the return'] },
  { id:'sumo-squat', n:'Dumbbell Sumo Squat', m:['Glutes','Inner Thighs','Quads'], eq:'min', t:'compound', v:'dumbbell sumo squat form', vid:'sQ-lwJtpwUc', cues:['Wide stance, toes out 30–45°','Dumbbell hangs between legs','Knees track over toes'], preg:true, post:true, note:'During pregnancy: bodyweight or very light, hold support.' },
  { id:'db-hip-thrust', n:'Dumbbell Hip Thrust', m:['Glutes','Hamstrings'], eq:'min', t:'compound', v:'dumbbell hip thrust form', vid:'wYT_Ru0yGD0', cues:['Dumbbell across the hips','Drive through the heels','Ribs down at lockout'], post:true },
  { id:'band-walk', n:'Banded Lateral Walk', m:['Glute Medius'], eq:'min', t:'isolation', v:'banded lateral walk form', vid:'sZ1vcY_VcwA', cues:['Band above knees, quarter squat','Step wide, never let knees cave','Burn = it is working'], preg:true, post:true },
  { id:'frog-pump', n:'Frog Pumps', m:['Glutes'], eq:'body', t:'isolation', v:'frog pumps glute exercise', vid:'rgljhH1X4vc', cues:['Soles of feet together','Pump hips up fast, squeeze','High-rep glute finisher'], post:true },
  { id:'glute-bridge', n:'Glute Bridge', m:['Glutes','Hamstrings'], eq:'body', t:'compound', v:'glute bridge proper form', vid:'wPM8icPu6H8', cues:['Heels close to hips','Squeeze glutes to lift','Straight line: knees→hips→shoulders'], preg:true, post:true, note:'During pregnancy after the 1st trimester keep sets brief or elevate the upper back.' },
  { id:'sl-glute-bridge', n:'Single-Leg Glute Bridge', m:['Glutes','Hamstrings','Core'], eq:'body', t:'compound', v:'single leg glute bridge form', vid:'yFNjwkUNIao', cues:['One knee to chest','Hips stay level','Push through the planted heel'], post:true },
  { id:'donkey-kick', n:'Donkey Kick', m:['Glutes'], eq:'body', t:'isolation', v:'donkey kick exercise form', vid:'YoOlLusFMYU', cues:['On all fours, flat back','Heel drives to the ceiling','Squeeze at the top, no arching'], preg:true, post:true },
  { id:'fire-hydrant', n:'Fire Hydrant', m:['Glute Medius'], eq:'body', t:'isolation', v:'fire hydrant exercise form', vid:'KOMtxRvGACA', cues:['On all fours','Lift the knee out to the side','Keep hips square'], preg:true, post:true },
  { id:'clamshell', n:'Clamshell', m:['Glute Medius','Hips'], eq:'body', t:'isolation', v:'clamshell exercise form', vid:'qJhOH9-2yDw', cues:['Side-lying, knees bent 45°','Open the top knee like a clam','Feet stay together'], preg:true, post:true },
  { id:'side-leg-raise', n:'Side-Lying Leg Raise', m:['Glute Medius','Outer Thigh'], eq:'body', t:'isolation', v:'side lying leg raise form', vid:'jgh6sGwtTwk', cues:['Body in one straight line','Lift leg to 45°','Slow on the way down'], preg:true, post:true },

  /* ---------------- CALVES ---------------- */
  { id:'standing-calf', n:'Standing Calf Raise (Machine)', m:['Calves'], eq:'gym', t:'isolation', v:'standing calf raise machine form', vid:'95itLfMBG40', cues:['Full stretch at the bottom','Pause 1s on tip-toes','No bouncing'] },
  { id:'seated-calf', n:'Seated Calf Raise', m:['Calves'], eq:'gym', t:'isolation', v:'seated calf raise form', vid:'60XGTGOjdXA', cues:['Targets the deeper soleus','Slow full range','Squeeze every rep'] },
  { id:'db-calf', n:'Dumbbell Calf Raise', m:['Calves'], eq:'min', t:'isolation', v:'dumbbell calf raise form', vid:'ADITZCcUyVo', cues:['Hold dumbbells at sides','Rise to tip-toes, pause','Stretch heels down slowly'], preg:true, post:true },
  { id:'sl-calf', n:'Single-Leg Calf Raise', m:['Calves'], eq:'body', t:'isolation', v:'single leg calf raise form', vid:'ElcvJ0kjt6c', cues:['Fingertips on wall for balance','One leg at a time','Full range every rep'], preg:true, post:true },

  /* ---------------- CORE ---------------- */
  { id:'cable-crunch', n:'Cable Crunch', m:['Abs'], eq:'gym', t:'core', v:'cable crunch form', vid:'dkGwcfo9zto', cues:['Kneel, rope beside ears','Crunch ribs to hips','Hips stay still — spine flexes'] },
  { id:'hanging-leg-raise', n:'Hanging Leg Raise', m:['Lower Abs','Hip Flexors'], eq:'gym', t:'core', v:'hanging leg raise form', vid:'2n4UqRIJyk4', cues:['Dead hang, no swing','Curl pelvis as legs rise','Bend knees to scale'] },
  { id:'ab-wheel', n:'Ab Wheel Rollout', m:['Abs','Core'], eq:'min', t:'core', v:'ab wheel rollout form', vid:'MinlHnG7j4k', cues:['Start from knees','Ribs down, no sagging hips','Roll only as far as you can control'] },
  { id:'russian-twist', n:'Dumbbell Russian Twist', m:['Obliques','Abs'], eq:'min', t:'core', v:'russian twist form', vid:'-BzNffL_6YE', cues:['Lean back 45°, chest proud','Rotate shoulders, not just arms','Feet down = easier'] },
  { id:'pallof-press', n:'Band Pallof Press', m:['Core','Obliques'], eq:'min', t:'core', v:'pallof press band form', vid:'y1fOBVtANdM', cues:['Band at chest height, stand side-on','Press arms straight out','Resist the rotation — that IS the rep'], preg:true, post:true },
  { id:'plank', n:'Plank', m:['Core','Abs'], eq:'body', t:'core', v:'plank proper form', vid:'v25dawSzRTM', cues:['Elbows under shoulders','Squeeze glutes, tuck ribs','A straight line from head to heels'], post:true },
  { id:'side-plank', n:'Side Plank', m:['Obliques','Core'], eq:'body', t:'core', v:'side plank form', vid:'NQsqPcarPXY', cues:['Elbow under shoulder','Lift hips high','Stack or stagger the feet'], preg:true, post:true, note:'During pregnancy: from knees, short holds.' },
  { id:'dead-bug', n:'Dead Bug', m:['Deep Core','Abs'], eq:'body', t:'core', v:'dead bug exercise form', vid:'o4GKiEoYClI', cues:['Lower back glued to the floor','Opposite arm + leg extend','Exhale as you reach'], post:true, note:'Gold-standard safe core exercise.' },
  { id:'bird-dog', n:'Bird Dog', m:['Core','Lower Back','Glutes'], eq:'body', t:'core', v:'bird dog exercise form', vid:'_1j_HWknGLg', cues:['Opposite arm + leg reach','Hips stay level like a table','Pause 2s, switch'], preg:true, post:true },
  { id:'bicycle-crunch', n:'Bicycle Crunch', m:['Abs','Obliques'], eq:'body', t:'core', v:'bicycle crunch proper form', vid:'Or3BkGOTt8Y', cues:['Slow > fast','Shoulder toward opposite knee','Keep lower back down'] },
  { id:'mountain-climber', n:'Mountain Climber', m:['Core','Cardio'], eq:'body', t:'cardio', v:'mountain climbers form', vid:'ruQ4ZwncXBg', cues:['Hands under shoulders','Drive knees to chest','Hips stay low'] },
  { id:'leg-raise', n:'Lying Leg Raise', m:['Lower Abs'], eq:'body', t:'core', v:'lying leg raise form', vid:'xJJu-WiROM8', cues:['Hands under hips','Legs to vertical','Lower slow — never let heels slam'] },
  { id:'hollow-hold', n:'Hollow Body Hold', m:['Abs','Core'], eq:'body', t:'core', v:'hollow body hold form', vid:'Xk-JcNj6lfY', cues:['Lower back pressed down','Arms and legs hover','Banana shape, breathe'] },
  { id:'reverse-crunch', n:'Reverse Crunch', m:['Lower Abs'], eq:'body', t:'core', v:'reverse crunch form', vid:'eX9vjAsdWvY', cues:['Knees to chest, lift hips','Slow lower without arching','Exhale at the top'], post:true },
  { id:'heel-tap', n:'Heel Taps', m:['Obliques'], eq:'body', t:'core', v:'heel taps oblique exercise', vid:'i-BBrCVNT9A', cues:['Shoulders slightly lifted','Reach for each heel','Small controlled side bends'] },

  /* ---------------- CARDIO / CONDITIONING ---------------- */
  { id:'treadmill-intervals', n:'Treadmill Intervals', m:['Cardio','Legs'], eq:'gym', t:'cardio', v:'treadmill interval training beginners', vid:'BrliNdYmRVQ', cues:['1 min fast / 1–2 min easy','Repeat 8–10 rounds','Fast should feel like 8/10 effort'] },
  { id:'rowing', n:'Rowing Machine', m:['Cardio','Back','Legs'], eq:'gym', t:'cardio', v:'rowing machine proper technique', vid:'7EQJFjM4Vs8', cues:['Legs → body → arms','Arms → body → legs on the return','Power comes from the legs'] },
  { id:'stair-climber', n:'Stair Climber', m:['Cardio','Glutes','Legs'], eq:'gym', t:'cardio', v:'stair climber machine workout', vid:'RZRgHBPKKP8', cues:['Stand tall, light grip on rails','Whole foot on each step','Steady conversational pace'] },
  { id:'assault-bike', n:'Air Bike Sprints', m:['Cardio','Full Body'], eq:'gym', t:'cardio', v:'assault bike interval workout', vid:'LNVUxj7sPhs', cues:['20s all-out / 40s easy','Push AND pull the handles','8–10 rounds'] },
  { id:'battle-ropes', n:'Battle Ropes', m:['Cardio','Shoulders','Core'], eq:'gym', t:'cardio', v:'battle ropes workout form', vid:'Bmdhgscsk-Y', cues:['Athletic stance, soft knees','Alternating waves','20–30s on, 30s off'] },
  { id:'jump-rope', n:'Jump Rope', m:['Cardio','Calves'], eq:'min', t:'cardio', v:'jump rope for beginners tutorial', vid:'IFgQfVQT_68', cues:['Jump only 1–2 inches','Wrists spin, not arms','Soft knees, quiet landings'] },
  { id:'kb-swing', n:'Kettlebell / DB Swing', m:['Glutes','Hamstrings','Cardio'], eq:'min', t:'cardio', v:'kettlebell swing proper form', vid:'bDCeXbMJVNs', cues:['A hip HINGE, not a squat','Snap the hips, arms are ropes','Bell floats to chest height'] },
  { id:'db-thruster', n:'Dumbbell Thruster', m:['Full Body','Cardio'], eq:'min', t:'cardio', v:'dumbbell thruster form', vid:'-rHJkjHUbmo', cues:['Front squat into overhead press','One fluid motion','Breathe every rep'] },
  { id:'burpee', n:'Burpee', m:['Full Body','Cardio'], eq:'body', t:'cardio', v:'burpee proper form', vid:'G2hv_NYhM-A', cues:['Chest to floor','Snap hips up, jump','Step back instead of jumping to scale'] },
  { id:'high-knees', n:'High Knees', m:['Cardio','Core'], eq:'body', t:'cardio', v:'high knees exercise form', vid:'LJMrXG_vPQ8', cues:['Knees to hip height','Stay on the balls of your feet','Pump the arms'] },
  { id:'jumping-jack', n:'Jumping Jacks', m:['Cardio','Full Body'], eq:'body', t:'cardio', v:'jumping jacks proper form', vid:'uLVt6u15L98', cues:['Full arm swing overhead','Land soft','Steady rhythm'] },
  { id:'skater-jump', n:'Skater Jumps', m:['Cardio','Glutes','Balance'], eq:'body', t:'cardio', v:'skater jumps exercise form', vid:'qM5jviFhw9U', cues:['Bound side to side','Land on one foot, hold briefly','Swing arms for power'] },
  { id:'shadow-boxing', n:'Shadow Boxing', m:['Cardio','Shoulders','Core'], eq:'body', t:'cardio', v:'shadow boxing workout beginner', vid:'KidSVNv0WcY', cues:['Jab–cross–hook combos','Stay light on your feet','3-minute rounds'] },
  { id:'bear-crawl', n:'Bear Crawl', m:['Full Body','Core'], eq:'body', t:'cardio', v:'bear crawl exercise form', vid:'l8eRtgP7ZoY', cues:['Knees hover 1 inch off the floor','Opposite hand + foot move together','Slow = harder'] },
  { id:'brisk-walk', n:'Brisk Walk / March', m:['Cardio','Legs'], eq:'body', t:'cardio', v:'brisk walking workout benefits', vid:'3Hobt4Pb4iA', cues:['Pace where talking is possible but singing is not','Swing the arms','10–30 minutes'], preg:true, post:true },

  /* ---------------- PREGNANCY / POSTPARTUM SPECIALS ---------------- */
  { id:'pelvic-tilt', n:'Pelvic Tilt', m:['Deep Core','Lower Back'], eq:'body', t:'core', v:'pelvic tilt exercise pregnancy', vid:'moa4h-rjuNE', cues:['Standing or on all fours','Tuck the tailbone, flatten the low back','Exhale as you tilt'], preg:true, post:true },
  { id:'cat-cow', n:'Cat-Cow Stretch', m:['Spine','Core','Mobility'], eq:'body', t:'mobility', v:'cat cow stretch tutorial', vid:'LIVJZZyZ2qM', cues:['Inhale: belly drops, chest lifts (cow)','Exhale: round the spine (cat)','Move with the breath'], preg:true, post:true },
  { id:'kegel', n:'Pelvic Floor Squeeze (Kegel)', m:['Pelvic Floor'], eq:'body', t:'core', v:'kegel exercise how to pelvic floor', vid:'Wjb20SXIvA4', cues:['Squeeze like stopping the flow of urine','Hold 5s, fully relax 5s','Relaxing fully is half the exercise'], preg:true, post:true },
  { id:'diaphragm-breath', n:'Diaphragmatic Breathing', m:['Deep Core','Pelvic Floor'], eq:'body', t:'recovery', v:'diaphragmatic breathing exercise tutorial', vid:'kgTL5G1ibIo', cues:['One hand on chest, one on belly','Inhale into the belly hand','Long slow exhale, ribs knit down'], preg:true, post:true, note:'The foundation of postpartum core recovery.' },
  { id:'heel-slide', n:'Heel Slides', m:['Deep Core'], eq:'body', t:'core', v:'heel slides core exercise postpartum', vid:'6-anByqnKp8', cues:['Lie down, knees bent','Exhale and slide one heel away','Lower back never arches'], post:true },
  { id:'wall-pushup', n:'Wall Push-Up', m:['Chest','Arms','Core'], eq:'body', t:'compound', v:'wall push up form', vid:'5NPvv40gd3Q', cues:['Hands on wall at shoulder height','Body rigid like a plank','Slow in, powerful out'], preg:true, post:true },
  { id:'seated-band-press', n:'Seated Band Shoulder Press', m:['Shoulders','Arms'], eq:'min', t:'compound', v:'seated resistance band shoulder press', vid:'KybK2zbg0n4', cues:['Sit tall on a chair','Press band overhead','Stop before straining'], preg:true, post:true },
  { id:'supported-squat', n:'Supported Squat (Hold Chair)', m:['Quads','Glutes'], eq:'body', t:'compound', v:'supported squat pregnancy safe', vid:'XjMHwv7BD_4', cues:['Hold a chair or counter','Wide comfortable stance','Only as deep as feels good'], preg:true, post:true },
  { id:'standing-abduction', n:'Standing Hip Abduction', m:['Glute Medius','Balance'], eq:'body', t:'isolation', v:'standing hip abduction exercise', vid:'qBqKuEQl9sI', cues:['Hold support, lift leg to the side','Toes point forward','Slow and controlled'], preg:true, post:true },
  { id:'farmer-carry-light', n:'Light Farmer Carry', m:['Grip','Core','Full Body'], eq:'min', t:'compound', v:'farmer carry exercise form', vid:'z7E_YU9P1jU', cues:['Light dumbbells at sides','Walk tall, shoulders back','Practical strength for daily life'], preg:true, post:true, note:'During pregnancy: light weights only, stop if any strain.' },
  { id:'side-stretch', n:'Standing Side Stretch', m:['Obliques','Mobility'], eq:'body', t:'mobility', v:'standing side stretch exercise', vid:'Vko-SJok-fk', cues:['Reach one arm overhead','Lean gently to the side','Breathe into the stretched ribs'], preg:true, post:true },

  /* ---------------- MOBILITY / RECOVERY ---------------- */
  { id:'worlds-greatest', n:"World's Greatest Stretch", m:['Hips','Spine','Mobility'], eq:'body', t:'mobility', v:'worlds greatest stretch tutorial', vid:'7XheaZERvBQ', cues:['Deep lunge, hand inside foot','Rotate chest to the ceiling','2–3 breaths each side'] },
  { id:'hip-flexor-stretch', n:'Kneeling Hip Flexor Stretch', m:['Hip Flexors','Mobility'], eq:'body', t:'mobility', v:'kneeling hip flexor stretch tutorial', vid:'ktgtEWGhFd8', cues:['Half-kneel, tuck the tailbone','Shift hips gently forward','Feel the front of the hip open'], preg:true, post:true },
  { id:'childs-pose', n:"Child's Pose", m:['Back','Hips','Recovery'], eq:'body', t:'mobility', v:'childs pose stretch tutorial', vid:'nMp3MlTz9fA', cues:['Knees wide, big toes together','Arms long, forehead down','5 slow breaths'], preg:true, post:true },
  { id:'ham-stretch', n:'Standing Hamstring Stretch', m:['Hamstrings','Mobility'], eq:'body', t:'mobility', v:'standing hamstring stretch tutorial', vid:'LVY692zJK0A', cues:['Heel on a low step','Hinge at hips, flat back','30 seconds per side'], preg:true, post:true },
  { id:'chest-doorway', n:'Doorway Chest Stretch', m:['Chest','Shoulders','Mobility'], eq:'body', t:'mobility', v:'doorway chest stretch tutorial', vid:'B9uY01NoqBg', cues:['Forearm on the doorframe','Step through gently','Great after pressing days'], preg:true, post:true },
];

/* Fast lookup map */
const EX_BY_ID = Object.fromEntries(EXERCISES.map(e => [e.id, e]));

/* Which equipment tiers each gym setting can access */
const EQUIP_ACCESS = {
  commercial: ['gym', 'min', 'body'],
  minimal:    ['min', 'body'],
  none:       ['body'],
};
