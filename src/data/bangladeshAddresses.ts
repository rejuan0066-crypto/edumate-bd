// Bangladesh 4-level address hierarchy: Division -> District -> Upazila -> Union
export interface AddressData {
  divisions: Division[];
}

export interface Division {
  name: string;
  nameEn: string;
  districts: District[];
}

export interface District {
  name: string;
  nameEn: string;
  upazilas: Upazila[];
}

export interface Upazila {
  name: string;
  nameEn: string;
  unions: Union[];
}

export interface Union {
  name: string;
  nameEn: string;
}

export const bangladeshAddresses: Division[] = [
  {
    name: 'ঢাকা', nameEn: 'Dhaka',
    districts: [
      { name: 'ঢাকা', nameEn: 'Dhaka', upazilas: [
        { name: 'ধামরাই', nameEn: 'Dhamrai', unions: [{ name: 'সুয়াপুর', nameEn: 'Suapur' }, { name: 'রোয়াইল', nameEn: 'Rowail' }, { name: 'কুশুরা', nameEn: 'Kushura' }] },
        { name: 'দোহার', nameEn: 'Dohar', unions: [{ name: 'নয়াবাড়ি', nameEn: 'Nayabari' }, { name: 'মহাকালী', nameEn: 'Mahakali' }] },
        { name: 'কেরানীগঞ্জ', nameEn: 'Keraniganj', unions: [{ name: 'কালীন্দী', nameEn: 'Kalindi' }, { name: 'তেঘরিয়া', nameEn: 'Teghoria' }] },
        { name: 'নবাবগঞ্জ', nameEn: 'Nawabganj', unions: [{ name: 'কলাকোপা', nameEn: 'Kalakopa' }, { name: 'বাসাইল', nameEn: 'Basail' }] },
        { name: 'সাভার', nameEn: 'Savar', unions: [{ name: 'আমিনবাজার', nameEn: 'Aminbazar' }, { name: 'বীরুলিয়া', nameEn: 'Birulia' }, { name: 'ধামসোনা', nameEn: 'Dhamsona' }] },
      ]},
      { name: 'গাজীপুর', nameEn: 'Gazipur', upazilas: [
        { name: 'গাজীপুর সদর', nameEn: 'Gazipur Sadar', unions: [{ name: 'বাড়িয়া', nameEn: 'Baria' }, { name: 'কাওরাইদ', nameEn: 'Kaowraid' }] },
        { name: 'কালীগঞ্জ', nameEn: 'Kaliganj', unions: [{ name: 'বক্তারপুর', nameEn: 'Boktarpur' }, { name: 'মুক্তারপুর', nameEn: 'Muktarpur' }] },
        { name: 'কাপাসিয়া', nameEn: 'Kapasia', unions: [{ name: 'তরগাঁও', nameEn: 'Torgaon' }, { name: 'সিংহশ্রী', nameEn: 'Singhashree' }] },
      ]},
      { name: 'মানিকগঞ্জ', nameEn: 'Manikganj', upazilas: [
        { name: 'মানিকগঞ্জ সদর', nameEn: 'Manikganj Sadar', unions: [{ name: 'দিঘুলিয়া', nameEn: 'Dighulia' }] },
        { name: 'সিংগাইর', nameEn: 'Singair', unions: [{ name: 'চারমুখা', nameEn: 'Charmukha' }] },
      ]},
      { name: 'নারায়ণগঞ্জ', nameEn: 'Narayanganj', upazilas: [
        { name: 'নারায়ণগঞ্জ সদর', nameEn: 'Narayanganj Sadar', unions: [{ name: 'ফতুল্লা', nameEn: 'Fatulla' }] },
        { name: 'সোনারগাঁও', nameEn: 'Sonargaon', unions: [{ name: 'পিরজপুর', nameEn: 'Pirojpur' }] },
      ]},
      { name: 'নরসিংদী', nameEn: 'Narsingdi', upazilas: [
        { name: 'নরসিংদী সদর', nameEn: 'Narsingdi Sadar', unions: [{ name: 'চর্মধুনা', nameEn: 'Chormodhuna' }] },
      ]},
    ]
  },
  {
    name: 'চট্টগ্রাম', nameEn: 'Chittagong',
    districts: [
      { name: 'চট্টগ্রাম', nameEn: 'Chittagong', upazilas: [
        { name: 'পটিয়া', nameEn: 'Patiya', unions: [{ name: 'ছনহরা', nameEn: 'Chanhara' }, { name: 'হাইদগাঁও', nameEn: 'Haidgaon' }] },
        { name: 'সীতাকুন্ড', nameEn: 'Sitakund', unions: [{ name: 'বারৈয়াধলা', nameEn: 'Barayadhala' }] },
        { name: 'হাটহাজারী', nameEn: 'Hathazari', unions: [{ name: 'চারিয়া', nameEn: 'Charia' }, { name: 'মোহরা', nameEn: 'Mohra' }] },
      ]},
      { name: "কক্সবাজার", nameEn: "Cox's Bazar", upazilas: [
        { name: 'কক্সবাজার সদর', nameEn: "Cox's Bazar Sadar", unions: [{ name: 'পোকখালী', nameEn: 'Pokkhali' }] },
        { name: 'টেকনাফ', nameEn: 'Teknaf', unions: [{ name: 'সাবরাং', nameEn: 'Sabrang' }] },
      ]},
      { name: 'কুমিল্লা', nameEn: 'Comilla', upazilas: [
        { name: 'কুমিল্লা সদর', nameEn: 'Comilla Sadar', unions: [{ name: 'আড্ডা', nameEn: 'Adda' }] },
      ]},
    ]
  },
  {
    name: 'রাজশাহী', nameEn: 'Rajshahi',
    districts: [
      { name: 'রাজশাহী', nameEn: 'Rajshahi', upazilas: [
        { name: 'রাজশাহী সদর', nameEn: 'Rajshahi Sadar', unions: [{ name: 'কাটাখালী', nameEn: 'Katakhali' }] },
        { name: 'পবা', nameEn: 'Paba', unions: [{ name: 'হরিপুর', nameEn: 'Haripur' }] },
      ]},
      { name: 'নাটোর', nameEn: 'Natore', upazilas: [
        { name: 'নাটোর সদর', nameEn: 'Natore Sadar', unions: [{ name: 'লক্ষ্মীপুর', nameEn: 'Laxmipur' }] },
      ]},
    ]
  },
  {
    name: 'খুলনা', nameEn: 'Khulna',
    districts: [
      { name: 'খুলনা', nameEn: 'Khulna', upazilas: [
        { name: 'খুলনা সদর', nameEn: 'Khulna Sadar', unions: [{ name: 'লবণচরা', nameEn: 'Labanchara' }] },
      ]},
      { name: 'যশোর', nameEn: 'Jessore', upazilas: [
        { name: 'যশোর সদর', nameEn: 'Jessore Sadar', unions: [{ name: 'চাঁচড়া', nameEn: 'Chanchra' }] },
      ]},
    ]
  },
  {
    name: 'সিলেট', nameEn: 'Sylhet',
    districts: [
      { name: 'সিলেট', nameEn: 'Sylhet', upazilas: [
        { name: 'সিলেট সদর', nameEn: 'Sylhet Sadar', unions: [{ name: 'খাদিমনগর', nameEn: 'Khadimnagar' }] },
        { name: 'বিশ্বনাথ', nameEn: 'Bishwanath', unions: [{ name: 'দশঘর', nameEn: 'Dashghar' }] },
      ]},
    ]
  },
  {
    name: 'বরিশাল', nameEn: 'Barisal',
    districts: [
      { name: 'বরিশাল', nameEn: 'Barisal', upazilas: [
        { name: 'বরিশাল সদর', nameEn: 'Barisal Sadar', unions: [{ name: 'চরমোনাই', nameEn: 'Charmonai' }] },
      ]},
    ]
  },
  {
    name: 'রংপুর', nameEn: 'Rangpur',
    districts: [
      { name: 'রংপুর', nameEn: 'Rangpur', upazilas: [
        { name: 'রংপুর সদর', nameEn: 'Rangpur Sadar', unions: [{ name: 'তাজহাট', nameEn: 'Tajhat' }] },
      ]},
      { name: 'দিনাজপুর', nameEn: 'Dinajpur', upazilas: [
        { name: 'দিনাজপুর সদর', nameEn: 'Dinajpur Sadar', unions: [{ name: 'চেহেলগাজী', nameEn: 'Chehelgazi' }] },
      ]},
    ]
  },
  {
    name: 'ময়মনসিংহ', nameEn: 'Mymensingh',
    districts: [
      { name: 'ময়মনসিংহ', nameEn: 'Mymensingh', upazilas: [
        { name: 'ময়মনসিংহ সদর', nameEn: 'Mymensingh Sadar', unions: [{ name: 'দাপুনিয়া', nameEn: 'Dapunia' }] },
      ]},
    ]
  },
];
