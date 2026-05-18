/**
 * Curated India address dataset for the Supplier wizard.
 * Each entry: { state: [ { name, pin }, ... ] }  — pin is a sensible default
 * for that city; the user can still edit it before submitting.
 */
export const INDIA_STATES = {
  'Andhra Pradesh': [
    { name: 'Visakhapatnam', pin: '530001' },
    { name: 'Vijayawada',    pin: '520001' },
    { name: 'Guntur',        pin: '522001' },
    { name: 'Tirupati',      pin: '517501' },
    { name: 'Nellore',       pin: '524001' }
  ],
  'Arunachal Pradesh': [
    { name: 'Itanagar', pin: '791111' },
    { name: 'Naharlagun', pin: '791110' },
    { name: 'Pasighat', pin: '791102' }
  ],
  'Assam': [
    { name: 'Guwahati',  pin: '781001' },
    { name: 'Dibrugarh', pin: '786001' },
    { name: 'Silchar',   pin: '788001' },
    { name: 'Jorhat',    pin: '785001' },
    { name: 'Tezpur',    pin: '784001' }
  ],
  'Bihar': [
    { name: 'Patna',     pin: '800001' },
    { name: 'Gaya',      pin: '823001' },
    { name: 'Bhagalpur', pin: '812001' },
    { name: 'Muzaffarpur', pin: '842001' },
    { name: 'Darbhanga', pin: '846004' }
  ],
  'Chhattisgarh': [
    { name: 'Raipur',  pin: '492001' },
    { name: 'Bilaspur', pin: '495001' },
    { name: 'Bhilai',  pin: '490001' },
    { name: 'Korba',   pin: '495677' }
  ],
  'Goa': [
    { name: 'Panaji',  pin: '403001' },
    { name: 'Margao',  pin: '403601' },
    { name: 'Vasco da Gama', pin: '403802' }
  ],
  'Gujarat': [
    { name: 'Ahmedabad', pin: '380001' },
    { name: 'Surat',     pin: '395003' },
    { name: 'Vadodara',  pin: '390001' },
    { name: 'Rajkot',    pin: '360001' },
    { name: 'Bhavnagar', pin: '364001' },
    { name: 'Gandhinagar', pin: '382010' }
  ],
  'Haryana': [
    { name: 'Gurugram',   pin: '122001' },
    { name: 'Faridabad',  pin: '121001' },
    { name: 'Panipat',    pin: '132103' },
    { name: 'Ambala',     pin: '134003' },
    { name: 'Karnal',     pin: '132001' }
  ],
  'Himachal Pradesh': [
    { name: 'Shimla',     pin: '171001' },
    { name: 'Dharamshala', pin: '176215' },
    { name: 'Manali',     pin: '175131' },
    { name: 'Solan',      pin: '173212' }
  ],
  'Jharkhand': [
    { name: 'Ranchi',    pin: '834001' },
    { name: 'Jamshedpur', pin: '831001' },
    { name: 'Dhanbad',   pin: '826001' },
    { name: 'Bokaro',    pin: '827001' }
  ],
  'Karnataka': [
    { name: 'Bengaluru', pin: '560001' },
    { name: 'Mysuru',    pin: '570001' },
    { name: 'Mangaluru', pin: '575001' },
    { name: 'Hubballi',  pin: '580020' },
    { name: 'Belagavi',  pin: '590001' },
    { name: 'Davanagere', pin: '577001' }
  ],
  'Kerala': [
    { name: 'Thiruvananthapuram', pin: '695001' },
    { name: 'Kochi',              pin: '682001' },
    { name: 'Kozhikode',          pin: '673001' },
    { name: 'Thrissur',           pin: '680001' },
    { name: 'Kollam',             pin: '691001' }
  ],
  'Madhya Pradesh': [
    { name: 'Bhopal',   pin: '462001' },
    { name: 'Indore',   pin: '452001' },
    { name: 'Gwalior',  pin: '474001' },
    { name: 'Jabalpur', pin: '482001' },
    { name: 'Ujjain',   pin: '456001' }
  ],
  'Maharashtra': [
    { name: 'Mumbai',     pin: '400001' },
    { name: 'Pune',       pin: '411001' },
    { name: 'Nagpur',     pin: '440001' },
    { name: 'Nashik',     pin: '422001' },
    { name: 'Aurangabad', pin: '431001' },
    { name: 'Thane',      pin: '400601' },
    { name: 'Kolhapur',   pin: '416001' }
  ],
  'Manipur':   [{ name: 'Imphal', pin: '795001' }, { name: 'Bishnupur', pin: '795126' }],
  'Meghalaya': [{ name: 'Shillong', pin: '793001' }, { name: 'Tura', pin: '794001' }],
  'Mizoram':   [{ name: 'Aizawl', pin: '796001' }, { name: 'Lunglei', pin: '796701' }],
  'Nagaland':  [{ name: 'Kohima', pin: '797001' }, { name: 'Dimapur', pin: '797112' }],
  'Odisha': [
    { name: 'Bhubaneswar', pin: '751001' },
    { name: 'Cuttack',     pin: '753001' },
    { name: 'Rourkela',    pin: '769001' },
    { name: 'Puri',        pin: '752001' }
  ],
  'Punjab': [
    { name: 'Ludhiana',  pin: '141001' },
    { name: 'Amritsar',  pin: '143001' },
    { name: 'Jalandhar', pin: '144001' },
    { name: 'Patiala',   pin: '147001' },
    { name: 'Mohali',    pin: '160059' }
  ],
  'Rajasthan': [
    { name: 'Jaipur',  pin: '302001' },
    { name: 'Jodhpur', pin: '342001' },
    { name: 'Udaipur', pin: '313001' },
    { name: 'Kota',    pin: '324001' },
    { name: 'Ajmer',   pin: '305001' },
    { name: 'Bikaner', pin: '334001' }
  ],
  'Sikkim': [
    { name: 'Gangtok',  pin: '737101' },
    { name: 'Namchi',   pin: '737126' }
  ],
  'Tamil Nadu': [
    { name: 'Chennai',     pin: '600001' },
    { name: 'Coimbatore',  pin: '641001' },
    { name: 'Madurai',     pin: '625001' },
    { name: 'Tiruchirappalli', pin: '620001' },
    { name: 'Salem',       pin: '636001' },
    { name: 'Tirunelveli', pin: '627001' },
    { name: 'Erode',       pin: '638001' }
  ],
  'Telangana': [
    { name: 'Hyderabad', pin: '500001' },
    { name: 'Warangal',  pin: '506002' },
    { name: 'Nizamabad', pin: '503001' },
    { name: 'Karimnagar', pin: '505001' }
  ],
  'Tripura': [
    { name: 'Agartala', pin: '799001' },
    { name: 'Udaipur',  pin: '799120' }
  ],
  'Uttar Pradesh': [
    { name: 'Lucknow',  pin: '226001' },
    { name: 'Kanpur',   pin: '208001' },
    { name: 'Varanasi', pin: '221001' },
    { name: 'Agra',     pin: '282001' },
    { name: 'Noida',    pin: '201301' },
    { name: 'Ghaziabad', pin: '201001' },
    { name: 'Allahabad (Prayagraj)', pin: '211001' }
  ],
  'Uttarakhand': [
    { name: 'Dehradun', pin: '248001' },
    { name: 'Haridwar', pin: '249401' },
    { name: 'Rishikesh', pin: '249201' },
    { name: 'Nainital', pin: '263001' }
  ],
  'West Bengal': [
    { name: 'Kolkata',    pin: '700001' },
    { name: 'Howrah',     pin: '711101' },
    { name: 'Siliguri',   pin: '734001' },
    { name: 'Durgapur',   pin: '713201' },
    { name: 'Asansol',    pin: '713301' }
  ],
  // Union Territories
  'Andaman and Nicobar Islands': [
    { name: 'Port Blair', pin: '744101' }
  ],
  'Chandigarh': [
    { name: 'Chandigarh', pin: '160001' }
  ],
  'Dadra and Nagar Haveli and Daman and Diu': [
    { name: 'Daman',  pin: '396210' },
    { name: 'Silvassa', pin: '396230' }
  ],
  'Delhi': [
    { name: 'New Delhi',    pin: '110001' },
    { name: 'Dwarka',       pin: '110075' },
    { name: 'Rohini',       pin: '110085' },
    { name: 'Saket',        pin: '110017' },
    { name: 'Karol Bagh',   pin: '110005' }
  ],
  'Jammu and Kashmir': [
    { name: 'Srinagar', pin: '190001' },
    { name: 'Jammu',    pin: '180001' }
  ],
  'Ladakh': [
    { name: 'Leh',   pin: '194101' },
    { name: 'Kargil', pin: '194103' }
  ],
  'Lakshadweep': [
    { name: 'Kavaratti', pin: '682555' }
  ],
  'Puducherry': [
    { name: 'Puducherry', pin: '605001' },
    { name: 'Karaikal',   pin: '609602' }
  ]
};

export const INDIA_STATE_NAMES = Object.keys(INDIA_STATES);

export function citiesForState(state) {
  return INDIA_STATES[state] || [];
}

export function pinForCity(state, cityName) {
  return (citiesForState(state).find((c) => c.name === cityName) || {}).pin || '';
}
