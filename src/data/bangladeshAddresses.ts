// Bangladesh address hierarchy: Division -> District -> Upazila/City Corporation/Municipality -> Union/Ward
// Comprehensive data: 8 Divisions, 64 Districts, Upazilas + City Corporations + Municipalities with Wards

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
  type?: 'upazila' | 'city_corporation' | 'municipality';
  unions: Union[];
}

export interface Union {
  name: string;
  nameEn: string;
}

export const bangladeshAddresses: Division[] = [
  {
    "name": "খুলনা",
    "nameEn": "Khulna",
    "districts": [
      {
        "name": "বাগেরহাট",
        "nameEn": "Bagerhat",
        "upazilas": [
          {
            "name": "বাগেরহাট পৌরসভা",
            "nameEn": "Bagerhat Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "বাগেরহাট সদর উপজেলা",
            "nameEn": "Bagerhat Sadar",
            "unions": [
              {
                "name": "ফকিরহাট",
                "nameEn": "ফকিরহাট"
              },
              {
                "name": "কচুয়া",
                "nameEn": "কচুয়া"
              },
              {
                "name": "রাখালগাছি",
                "nameEn": "রাখালগাছি"
              },
              {
                "name": "বেমরতা",
                "nameEn": "বেমরতা"
              },
              {
                "name": "ষাটদোহ",
                "nameEn": "ষাটদোহ"
              },
              {
                "name": "বারুইপাড়া",
                "nameEn": "বারুইপাড়া"
              },
              {
                "name": "দেবহাটা",
                "nameEn": "দেবহাটা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কচুয়া উপজেলা",
            "nameEn": "Chitalmari",
            "unions": [
              {
                "name": "চিতলমারী",
                "nameEn": "চিতলমারী"
              },
              {
                "name": "চরবানিয়ারী",
                "nameEn": "চরবানিয়ারী"
              },
              {
                "name": "কালাইচাপড়া",
                "nameEn": "কালাইচাপড়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "চিতলমারী উপজেলা",
            "nameEn": "Fakirhat",
            "unions": [
              {
                "name": "ফকিরহাট",
                "nameEn": "ফকিরহাট"
              },
              {
                "name": "বেতাগা",
                "nameEn": "বেতাগা"
              },
              {
                "name": "পিলজং",
                "nameEn": "পিলজং"
              },
              {
                "name": "শুভদিয়া",
                "nameEn": "শুভদিয়া"
              },
              {
                "name": "মুকুন্দকাটি",
                "nameEn": "মুকুন্দকাটি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ফকিরহাট উপজেলা",
            "nameEn": "Kachua",
            "unions": [
              {
                "name": "কচুয়া",
                "nameEn": "কচুয়া"
              },
              {
                "name": "বদরপুর",
                "nameEn": "বদরপুর"
              },
              {
                "name": "গোয়ালবাথান",
                "nameEn": "গোয়ালবাথান"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মোংলা উপজেলা",
            "nameEn": "Mollahat",
            "unions": [
              {
                "name": "মোল্লাহাট",
                "nameEn": "মোল্লাহাট"
              },
              {
                "name": "চুনখোলা",
                "nameEn": "চুনখোলা"
              },
              {
                "name": "গোপালপুর",
                "nameEn": "গোপালপুর"
              },
              {
                "name": "নাগরঘাটা",
                "nameEn": "নাগরঘাটা"
              },
              {
                "name": "পানগুছি",
                "nameEn": "পানগুছি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মোড়েলগঞ্জ উপজেলা",
            "nameEn": "Mongla",
            "unions": [
              {
                "name": "মোংলা",
                "nameEn": "মোংলা"
              },
              {
                "name": "বুড়িরডাঙ্গা",
                "nameEn": "বুড়িরডাঙ্গা"
              },
              {
                "name": "মোংলা পোর্ট",
                "nameEn": "মোংলা পোর্ট"
              },
              {
                "name": "সুন্দরবন",
                "nameEn": "সুন্দরবন"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মোল্লাহাট উপজেলা",
            "nameEn": "Morrelganj",
            "unions": [
              {
                "name": "মোড়েলগঞ্জ",
                "nameEn": "মোড়েলগঞ্জ"
              },
              {
                "name": "বারৈখালী",
                "nameEn": "বারৈখালী"
              },
              {
                "name": "পানখালী",
                "nameEn": "পানখালী"
              },
              {
                "name": "তেলিগাতি",
                "nameEn": "তেলিগাতি"
              },
              {
                "name": "নিশানবাড়িয়া",
                "nameEn": "নিশানবাড়িয়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "রামপাল উপজেলা",
            "nameEn": "Rampal",
            "unions": [
              {
                "name": "রামপাল",
                "nameEn": "রামপাল"
              },
              {
                "name": "গোরান",
                "nameEn": "গোরান"
              },
              {
                "name": "ভোজপাতিয়া",
                "nameEn": "ভোজপাতিয়া"
              },
              {
                "name": "পেড়িখালী",
                "nameEn": "পেড়িখালী"
              },
              {
                "name": "হুরকা",
                "nameEn": "হুরকা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "শরণখোলা উপজেলা",
            "nameEn": "Sharankhola",
            "unions": [
              {
                "name": "শরণখোলা",
                "nameEn": "শরণখোলা"
              },
              {
                "name": "ধানসাগর",
                "nameEn": "ধানসাগর"
              },
              {
                "name": "রায়েন্দা",
                "nameEn": "রায়েন্দা"
              },
              {
                "name": "সাউথখালী",
                "nameEn": "সাউথখালী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Mongla পৌরসভা",
            "nameEn": "Mongla Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Morrelganj পৌরসভা",
            "nameEn": "Morrelganj Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Fakirhat পৌরসভা",
            "nameEn": "Fakirhat Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "চুয়াডাঙ্গা",
        "nameEn": "Chuadanga",
        "upazilas": [
          {
            "name": "চুয়াডাঙ্গা পৌরসভা",
            "nameEn": "Chuadanga Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "চুয়াডাঙ্গা সদর উপজেলা",
            "nameEn": "Alamdanga",
            "unions": [
              {
                "name": "আলমডাঙ্গা",
                "nameEn": "আলমডাঙ্গা"
              },
              {
                "name": "হাটবোয়ালিয়া",
                "nameEn": "হাটবোয়ালিয়া"
              },
              {
                "name": "নাটুদহ",
                "nameEn": "নাটুদহ"
              },
              {
                "name": "খাসকররা",
                "nameEn": "খাসকররা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "আলমডাঙ্গা উপজেলা",
            "nameEn": "Chuadanga Sadar",
            "unions": [
              {
                "name": "চুয়াডাঙ্গা সদর",
                "nameEn": "চুয়াডাঙ্গা সদর"
              },
              {
                "name": "শংকরপুর",
                "nameEn": "শংকরপুর"
              },
              {
                "name": "আলুকদিয়া",
                "nameEn": "আলুকদিয়া"
              },
              {
                "name": "দর্শনা",
                "nameEn": "দর্শনা"
              },
              {
                "name": "তুতপাড়া",
                "nameEn": "তুতপাড়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "জীবননগর উপজেলা",
            "nameEn": "Damurhuda",
            "unions": [
              {
                "name": "দামুড়হুদা",
                "nameEn": "দামুড়হুদা"
              },
              {
                "name": "জুরানপুর",
                "nameEn": "জুরানপুর"
              },
              {
                "name": "কুড়ালগাছি",
                "nameEn": "কুড়ালগাছি"
              },
              {
                "name": "পড়াগাছা",
                "nameEn": "পড়াগাছা"
              },
              {
                "name": "নতিপোতা",
                "nameEn": "নতিপোতা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "দামুড়হুদা উপজেলা",
            "nameEn": "Jibannagar",
            "unions": [
              {
                "name": "জীবননগর",
                "nameEn": "জীবননগর"
              },
              {
                "name": "চান্দ্রপুর",
                "nameEn": "চান্দ্রপুর"
              },
              {
                "name": "পাতিলা",
                "nameEn": "পাতিলা"
              },
              {
                "name": "মোহাম্মদনগর",
                "nameEn": "মোহাম্মদনগর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Alamdanga পৌরসভা",
            "nameEn": "Alamdanga Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Damurhuda পৌরসভা",
            "nameEn": "Damurhuda Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "যশোর",
        "nameEn": "Jashore",
        "upazilas": [
          {
            "name": "যশোর পৌরসভা",
            "nameEn": "Jashore Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "যশোর সদর উপজেলা",
            "nameEn": "Abhoynagar",
            "unions": [
              {
                "name": "অভয়নগর",
                "nameEn": "অভয়নগর"
              },
              {
                "name": "বাঘুটিয়া",
                "nameEn": "বাঘুটিয়া"
              },
              {
                "name": "পয়সা",
                "nameEn": "পয়সা"
              },
              {
                "name": "সুন্দরপুর",
                "nameEn": "সুন্দরপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "অভয়নগর উপজেলা",
            "nameEn": "Bagherpara",
            "unions": [
              {
                "name": "বাঘারপাড়া",
                "nameEn": "বাঘারপাড়া"
              },
              {
                "name": "জামালপুর",
                "nameEn": "জামালপুর"
              },
              {
                "name": "বারীনগর",
                "nameEn": "বারীনগর"
              },
              {
                "name": "সতুজান",
                "nameEn": "সতুজান"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কেশবপুর উপজেলা",
            "nameEn": "Chowgacha",
            "unions": [
              {
                "name": "চৌগাছা",
                "nameEn": "চৌগাছা"
              },
              {
                "name": "ধূলিয়ানী",
                "nameEn": "ধূলিয়ানী"
              },
              {
                "name": "নারায়ণপুর",
                "nameEn": "নারায়ণপুর"
              },
              {
                "name": "স্বরূপদাহ",
                "nameEn": "স্বরূপদাহ"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "চৌগাছা উপজেলা",
            "nameEn": "Jashore Sadar",
            "unions": [
              {
                "name": "যশোর সদর",
                "nameEn": "যশোর সদর"
              },
              {
                "name": "দিয়াড়",
                "nameEn": "দিয়াড়"
              },
              {
                "name": "লেবুতলা",
                "nameEn": "লেবুতলা"
              },
              {
                "name": "ফতেহপুর",
                "nameEn": "ফতেহপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ঝিকরগাছা উপজেলা",
            "nameEn": "Jhikargacha",
            "unions": [
              {
                "name": "ঝিকরগাছা",
                "nameEn": "ঝিকরগাছা"
              },
              {
                "name": "গদখালী",
                "nameEn": "গদখালী"
              },
              {
                "name": "সাগরদাঁড়ি",
                "nameEn": "সাগরদাঁড়ি"
              },
              {
                "name": "মাগুরা",
                "nameEn": "মাগুরা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বাঘারপাড়া উপজেলা",
            "nameEn": "Keshabpur",
            "unions": [
              {
                "name": "কেশবপুর",
                "nameEn": "কেশবপুর"
              },
              {
                "name": "সাগরদাঁড়ী",
                "nameEn": "সাগরদাঁড়ী"
              },
              {
                "name": "বিদ্যানন্দকাটি",
                "nameEn": "বিদ্যানন্দকাটি"
              },
              {
                "name": "পাজিয়া",
                "nameEn": "পাজিয়া"
              },
              {
                "name": "মঙ্গলকোট",
                "nameEn": "মঙ্গলকোট"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মনিরামপুর উপজেলা",
            "nameEn": "Monirampur",
            "unions": [
              {
                "name": "মণিরামপুর",
                "nameEn": "মণিরামপুর"
              },
              {
                "name": "কাঁঠালতলা",
                "nameEn": "কাঁঠালতলা"
              },
              {
                "name": "রোহিতা",
                "nameEn": "রোহিতা"
              },
              {
                "name": "শংকরপুর",
                "nameEn": "শংকরপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "শার্শা উপজেলা",
            "nameEn": "Sarsha",
            "unions": [
              {
                "name": "শার্শা",
                "nameEn": "শার্শা"
              },
              {
                "name": "বাগডাঙ্গা",
                "nameEn": "বাগডাঙ্গা"
              },
              {
                "name": "বেনাপোল",
                "nameEn": "বেনাপোল"
              },
              {
                "name": "নাভারণ",
                "nameEn": "নাভারণ"
              }
            ],
            "type": "upazila"
          }
        ]
      },
      {
        "name": "ঝিনাইদহ",
        "nameEn": "Jhenaidah",
        "upazilas": [
          {
            "name": "ঝিনাইদহ পৌরসভা",
            "nameEn": "Jhenaidah Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "ঝিনাইদহ সদর উপজেলা",
            "nameEn": "Harinakunda",
            "unions": [
              {
                "name": "হরিণাকুন্ডু",
                "nameEn": "হরিণাকুন্ডু"
              },
              {
                "name": "ভবানীপুর",
                "nameEn": "ভবানীপুর"
              },
              {
                "name": "মাথাভাঙ্গা",
                "nameEn": "মাথাভাঙ্গা"
              },
              {
                "name": "রতনপুর",
                "nameEn": "রতনপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কালীগঞ্জ উপজেলা",
            "nameEn": "Jhenaidah Sadar",
            "unions": [
              {
                "name": "ঝিনাইদহ সদর",
                "nameEn": "ঝিনাইদহ সদর"
              },
              {
                "name": "ঘোড়াঘাট",
                "nameEn": "ঘোড়াঘাট"
              },
              {
                "name": "পদ্মাবতী",
                "nameEn": "পদ্মাবতী"
              },
              {
                "name": "সৈয়দপুর",
                "nameEn": "সৈয়দপুর"
              },
              {
                "name": "দুধসর",
                "nameEn": "দুধসর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কোটচাঁদপুর উপজেলা",
            "nameEn": "Kaliganj",
            "unions": [
              {
                "name": "Kaliganj সদর",
                "nameEn": "Kaliganj Sadar"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মহেশপুর উপজেলা",
            "nameEn": "Kotchandpur",
            "unions": [
              {
                "name": "কোটচাঁদপুর",
                "nameEn": "কোটচাঁদপুর"
              },
              {
                "name": "কলোড়া",
                "nameEn": "কলোড়া"
              },
              {
                "name": "লংগলজোড়",
                "nameEn": "লংগলজোড়"
              },
              {
                "name": "সুখপুকুরিয়া",
                "nameEn": "সুখপুকুরিয়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "শৈলকুপা উপজেলা",
            "nameEn": "Moheshpur",
            "unions": [
              {
                "name": "মহেশপুর",
                "nameEn": "মহেশপুর"
              },
              {
                "name": "মনোহরপুর",
                "nameEn": "মনোহরপুর"
              },
              {
                "name": "ফতেহপুর",
                "nameEn": "ফতেহপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "হরিণাকুন্ডু উপজেলা",
            "nameEn": "Shailkupa",
            "unions": [
              {
                "name": "শৈলকুপা",
                "nameEn": "শৈলকুপা"
              },
              {
                "name": "বিরামপুর",
                "nameEn": "বিরামপুর"
              },
              {
                "name": "বাড়ইগ্রাম",
                "nameEn": "বাড়ইগ্রাম"
              },
              {
                "name": "আওতাপাড়া",
                "nameEn": "আওতাপাড়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Kaliganj পৌরসভা",
            "nameEn": "Kaliganj Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Shailkupa পৌরসভা",
            "nameEn": "Shailkupa Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Maheshpur পৌরসভা",
            "nameEn": "Maheshpur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "খুলনা",
        "nameEn": "Khulna",
        "upazilas": [
          {
            "name": "খুলনা সিটি কর্পোরেশন",
            "nameEn": "Khulna City Corporation",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              },
              {
                "name": "ওয়ার্ড নং-10",
                "nameEn": "Ward No-10"
              },
              {
                "name": "ওয়ার্ড নং-11",
                "nameEn": "Ward No-11"
              },
              {
                "name": "ওয়ার্ড নং-12",
                "nameEn": "Ward No-12"
              },
              {
                "name": "ওয়ার্ড নং-13",
                "nameEn": "Ward No-13"
              },
              {
                "name": "ওয়ার্ড নং-14",
                "nameEn": "Ward No-14"
              },
              {
                "name": "ওয়ার্ড নং-15",
                "nameEn": "Ward No-15"
              },
              {
                "name": "ওয়ার্ড নং-16",
                "nameEn": "Ward No-16"
              },
              {
                "name": "ওয়ার্ড নং-17",
                "nameEn": "Ward No-17"
              },
              {
                "name": "ওয়ার্ড নং-18",
                "nameEn": "Ward No-18"
              },
              {
                "name": "ওয়ার্ড নং-19",
                "nameEn": "Ward No-19"
              },
              {
                "name": "ওয়ার্ড নং-20",
                "nameEn": "Ward No-20"
              },
              {
                "name": "ওয়ার্ড নং-21",
                "nameEn": "Ward No-21"
              },
              {
                "name": "ওয়ার্ড নং-22",
                "nameEn": "Ward No-22"
              },
              {
                "name": "ওয়ার্ড নং-23",
                "nameEn": "Ward No-23"
              },
              {
                "name": "ওয়ার্ড নং-24",
                "nameEn": "Ward No-24"
              },
              {
                "name": "ওয়ার্ড নং-25",
                "nameEn": "Ward No-25"
              },
              {
                "name": "ওয়ার্ড নং-26",
                "nameEn": "Ward No-26"
              },
              {
                "name": "ওয়ার্ড নং-27",
                "nameEn": "Ward No-27"
              },
              {
                "name": "ওয়ার্ড নং-28",
                "nameEn": "Ward No-28"
              },
              {
                "name": "ওয়ার্ড নং-29",
                "nameEn": "Ward No-29"
              },
              {
                "name": "ওয়ার্ড নং-30",
                "nameEn": "Ward No-30"
              },
              {
                "name": "ওয়ার্ড নং-31",
                "nameEn": "Ward No-31"
              }
            ],
            "type": "city_corporation"
          },
          {
            "name": "কয়রা উপজেলা",
            "nameEn": "Batiaghata",
            "unions": [
              {
                "name": "বটিয়াঘাটা",
                "nameEn": "বটিয়াঘাটা"
              },
              {
                "name": "বলাবুনিয়া",
                "nameEn": "বলাবুনিয়া"
              },
              {
                "name": "গঙ্গারামপুর",
                "nameEn": "গঙ্গারামপুর"
              },
              {
                "name": "সুরখালী",
                "nameEn": "সুরখালী"
              },
              {
                "name": "জলমা",
                "nameEn": "জলমা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ডুমুরিয়া উপজেলা",
            "nameEn": "Dacope",
            "unions": [
              {
                "name": "দাকোপ",
                "nameEn": "দাকোপ"
              },
              {
                "name": "পানখালী",
                "nameEn": "পানখালী"
              },
              {
                "name": "কৈলাশগঞ্জ",
                "nameEn": "কৈলাশগঞ্জ"
              },
              {
                "name": "বানিশান্তা",
                "nameEn": "বানিশান্তা"
              },
              {
                "name": "সুতারখালি",
                "nameEn": "সুতারখালি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "তেরখাদা উপজেলা",
            "nameEn": "Dighalia",
            "unions": [
              {
                "name": "দিঘলিয়া",
                "nameEn": "দিঘলিয়া"
              },
              {
                "name": "সেনহাটি",
                "nameEn": "সেনহাটি"
              },
              {
                "name": "গাজীরহাট",
                "nameEn": "গাজীরহাট"
              },
              {
                "name": "আড়ংঘাটা",
                "nameEn": "আড়ংঘাটা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "দাকোপ উপজেলা",
            "nameEn": "Dumuria",
            "unions": [
              {
                "name": "ডুমুরিয়া",
                "nameEn": "ডুমুরিয়া"
              },
              {
                "name": "শোলগাতিয়া",
                "nameEn": "শোলগাতিয়া"
              },
              {
                "name": "রুদাঘরা",
                "nameEn": "রুদাঘরা"
              },
              {
                "name": "শোভনা",
                "nameEn": "শোভনা"
              },
              {
                "name": "কৈলাশগঞ্জ",
                "nameEn": "কৈলাশগঞ্জ"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "দিঘলিয়া উপজেলা",
            "nameEn": "Koira",
            "unions": [
              {
                "name": "কয়রা",
                "nameEn": "কয়রা"
              },
              {
                "name": "মহেশ্বরীপুর",
                "nameEn": "মহেশ্বরীপুর"
              },
              {
                "name": "বাগালী",
                "nameEn": "বাগালী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "পাইকগাছা উপজেলা",
            "nameEn": "Paikgacha",
            "unions": [
              {
                "name": "পাইকগাছা",
                "nameEn": "পাইকগাছা"
              },
              {
                "name": "কপিলমুনি",
                "nameEn": "কপিলমুনি"
              },
              {
                "name": "গড়ইখালী",
                "nameEn": "গড়ইখালী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ফুলতলা উপজেলা",
            "nameEn": "Phultala",
            "unions": [
              {
                "name": "ফুলতলা",
                "nameEn": "ফুলতলা"
              },
              {
                "name": "আটলিয়া",
                "nameEn": "আটলিয়া"
              },
              {
                "name": "দামোদর",
                "nameEn": "দামোদর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বটিয়াঘাটা উপজেলা",
            "nameEn": "Rupsa",
            "unions": [
              {
                "name": "রূপসা",
                "nameEn": "রূপসা"
              },
              {
                "name": "চাঁদখালী",
                "nameEn": "চাঁদখালী"
              },
              {
                "name": "আইচগাতি",
                "nameEn": "আইচগাতি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "রূপসা উপজেলা",
            "nameEn": "Terokhada",
            "unions": [
              {
                "name": "তেরখাদা",
                "nameEn": "তেরখাদা"
              },
              {
                "name": "আজগরা",
                "nameEn": "আজগরা"
              },
              {
                "name": "সচিদানন্দপুর",
                "nameEn": "সচিদানন্দপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Phultala পৌরসভা",
            "nameEn": "Phultala Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Dumuria পৌরসভা",
            "nameEn": "Dumuria Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Paikgachha পৌরসভা",
            "nameEn": "Paikgachha Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Batiaghata পৌরসভা",
            "nameEn": "Batiaghata Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "কুষ্টিয়া",
        "nameEn": "Kushtia",
        "upazilas": [
          {
            "name": "কুষ্টিয়া পৌরসভা",
            "nameEn": "Kushtia Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              },
              {
                "name": "ওয়ার্ড নং-10",
                "nameEn": "Ward No-10"
              },
              {
                "name": "ওয়ার্ড নং-11",
                "nameEn": "Ward No-11"
              },
              {
                "name": "ওয়ার্ড নং-12",
                "nameEn": "Ward No-12"
              },
              {
                "name": "ওয়ার্ড নং-13",
                "nameEn": "Ward No-13"
              },
              {
                "name": "ওয়ার্ড নং-14",
                "nameEn": "Ward No-14"
              },
              {
                "name": "ওয়ার্ড নং-15",
                "nameEn": "Ward No-15"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "কুষ্টিয়া সদর উপজেলা",
            "nameEn": "Bheramara",
            "unions": [
              {
                "name": "ভেড়ামারা",
                "nameEn": "ভেড়ামারা"
              },
              {
                "name": "বাহিরচাপড়া",
                "nameEn": "বাহিরচাপড়া"
              },
              {
                "name": "দুর্লভপুর",
                "nameEn": "দুর্লভপুর"
              },
              {
                "name": "মোহনপুর",
                "nameEn": "মোহনপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কুমারখালী উপজেলা",
            "nameEn": "Daulatpur",
            "unions": [
              {
                "name": "দৌলতপুর",
                "nameEn": "দৌলতপুর"
              },
              {
                "name": "আলুতলা",
                "nameEn": "আলুতলা"
              },
              {
                "name": "খানপুর",
                "nameEn": "খানপুর"
              },
              {
                "name": "সেনহাটি",
                "nameEn": "সেনহাটি"
              },
              {
                "name": "ফুলতলা",
                "nameEn": "ফুলতলা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "খোকসা উপজেলা",
            "nameEn": "Khoksha",
            "unions": [
              {
                "name": "খোকসা",
                "nameEn": "খোকসা"
              },
              {
                "name": "আমলা",
                "nameEn": "আমলা"
              },
              {
                "name": "কুমারখালী",
                "nameEn": "কুমারখালী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "দৌলতপুর উপজেলা",
            "nameEn": "Kumarkhali",
            "unions": [
              {
                "name": "কুমারখালী",
                "nameEn": "কুমারখালী"
              },
              {
                "name": "জাফরপুর",
                "nameEn": "জাফরপুর"
              },
              {
                "name": "পদমদি",
                "nameEn": "পদমদি"
              },
              {
                "name": "শিলাইদহ",
                "nameEn": "শিলাইদহ"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ভেড়ামারা উপজেলা",
            "nameEn": "Kushtia Sadar",
            "unions": [
              {
                "name": "কুষ্টিয়া সদর",
                "nameEn": "কুষ্টিয়া সদর"
              },
              {
                "name": "জগতি",
                "nameEn": "জগতি"
              },
              {
                "name": "আলমপুর",
                "nameEn": "আলমপুর"
              },
              {
                "name": "হাটশহরিপুর",
                "nameEn": "হাটশহরিপুর"
              },
              {
                "name": "মজমপুর",
                "nameEn": "মজমপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মিরপুর উপজেলা",
            "nameEn": "Mirpur",
            "unions": [
              {
                "name": "মিরপুর",
                "nameEn": "মিরপুর"
              },
              {
                "name": "আমবাড়িয়া",
                "nameEn": "আমবাড়িয়া"
              },
              {
                "name": "পোড়াদহ",
                "nameEn": "পোড়াদহ"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Kumarkhali পৌরসভা",
            "nameEn": "Kumarkhali Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Mirpur পৌরসভা",
            "nameEn": "Mirpur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Bheramara পৌরসভা",
            "nameEn": "Bheramara Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "মাগুরা",
        "nameEn": "Magura",
        "upazilas": [
          {
            "name": "মাগুরা পৌরসভা",
            "nameEn": "Magura Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "মাগুরা সদর উপজেলা",
            "nameEn": "Magura Sadar",
            "unions": [
              {
                "name": "মাগুরা সদর",
                "nameEn": "মাগুরা সদর"
              },
              {
                "name": "আটঘর",
                "nameEn": "আটঘর"
              },
              {
                "name": "জগদল",
                "nameEn": "জগদল"
              },
              {
                "name": "হাজরাপুর",
                "nameEn": "হাজরাপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মোহাম্মদপুর উপজেলা",
            "nameEn": "Mohammadpur",
            "unions": [
              {
                "name": "মোহাম্মদপুর",
                "nameEn": "মোহাম্মদপুর"
              },
              {
                "name": "বিনোদপুর",
                "nameEn": "বিনোদপুর"
              },
              {
                "name": "রায়পুর",
                "nameEn": "রায়পুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "শালিখা উপজেলা",
            "nameEn": "Salikha",
            "unions": [
              {
                "name": "শালিখা",
                "nameEn": "শালিখা"
              },
              {
                "name": "ধনেশ্বরপুর",
                "nameEn": "ধনেশ্বরপুর"
              },
              {
                "name": "বুনাগাতি",
                "nameEn": "বুনাগাতি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "শ্রীপুর উপজেলা",
            "nameEn": "Sreepur",
            "unions": [
              {
                "name": "শ্রীপুর",
                "nameEn": "শ্রীপুর"
              },
              {
                "name": "বালিয়াকান্দি",
                "nameEn": "বালিয়াকান্দি"
              },
              {
                "name": "গোপীনাথপুর",
                "nameEn": "গোপীনাথপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Mohammadpur পৌরসভা",
            "nameEn": "Mohammadpur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Shalikha পৌরসভা",
            "nameEn": "Shalikha Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Sreepur পৌরসভা",
            "nameEn": "Sreepur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "মেহেরপুর",
        "nameEn": "Meherpur",
        "upazilas": [
          {
            "name": "মেহেরপুর পৌরসভা",
            "nameEn": "Meherpur Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "মেহেরপুর সদর উপজেলা",
            "nameEn": "Gangni",
            "unions": [
              {
                "name": "গাংনী",
                "nameEn": "গাংনী"
              },
              {
                "name": "ধরমপুর",
                "nameEn": "ধরমপুর"
              },
              {
                "name": "শাহরপুর",
                "nameEn": "শাহরপুর"
              },
              {
                "name": "মাথুরাপুর",
                "nameEn": "মাথুরাপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "গাংনী উপজেলা",
            "nameEn": "Meherpur Sadar",
            "unions": [
              {
                "name": "মেহেরপুর সদর",
                "nameEn": "মেহেরপুর সদর"
              },
              {
                "name": "আমঝুপি",
                "nameEn": "আমঝুপি"
              },
              {
                "name": "বুড়িপোতা",
                "nameEn": "বুড়িপোতা"
              },
              {
                "name": "কুতুবপুর",
                "nameEn": "কুতুবপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মুজিবনগর উপজেলা",
            "nameEn": "Mujib Nagar",
            "unions": [
              {
                "name": "মুজিবনগর",
                "nameEn": "মুজিবনগর"
              },
              {
                "name": "বৈদ্যনাথতলা",
                "nameEn": "বৈদ্যনাথতলা"
              },
              {
                "name": "মহেন্দ্রপুর",
                "nameEn": "মহেন্দ্রপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Gangni পৌরসভা",
            "nameEn": "Gangni Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Mujibnagar পৌরসভা",
            "nameEn": "Mujibnagar Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "নড়াইল",
        "nameEn": "Narail",
        "upazilas": [
          {
            "name": "নড়াইল পৌরসভা",
            "nameEn": "Narail Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "নড়াইল সদর উপজেলা",
            "nameEn": "Kalia",
            "unions": [
              {
                "name": "কালিয়া",
                "nameEn": "কালিয়া"
              },
              {
                "name": "মাহমুদপুর",
                "nameEn": "মাহমুদপুর"
              },
              {
                "name": "পালুয়া",
                "nameEn": "পালুয়া"
              },
              {
                "name": "হামিদপুর",
                "nameEn": "হামিদপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কালিয়া উপজেলা",
            "nameEn": "Lohagara",
            "unions": [
              {
                "name": "Lohagara সদর",
                "nameEn": "Lohagara Sadar"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "লোহাগড়া উপজেলা",
            "nameEn": "Narail Sadar",
            "unions": [
              {
                "name": "নড়াইল সদর",
                "nameEn": "নড়াইল সদর"
              },
              {
                "name": "মাইজপাড়া",
                "nameEn": "মাইজপাড়া"
              },
              {
                "name": "বিদ্যানন্দকাটি",
                "nameEn": "বিদ্যানন্দকাটি"
              },
              {
                "name": "কালিয়া",
                "nameEn": "কালিয়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Lohagara পৌরসভা",
            "nameEn": "Lohagara Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Kalia পৌরসভা",
            "nameEn": "Kalia Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "সাতক্ষীরা",
        "nameEn": "Satkhira",
        "upazilas": [
          {
            "name": "সাতক্ষীরা পৌরসভা",
            "nameEn": "Satkhira Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "সাতক্ষীরা সদর উপজেলা",
            "nameEn": "Assasuni",
            "unions": [
              {
                "name": "আশাশুনি",
                "nameEn": "আশাশুনি"
              },
              {
                "name": "আনাদি",
                "nameEn": "আনাদি"
              },
              {
                "name": "প্রতাপনগর",
                "nameEn": "প্রতাপনগর"
              },
              {
                "name": "কদমতলা",
                "nameEn": "কদমতলা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "আশাশুনি উপজেলা",
            "nameEn": "Debhata",
            "unions": [
              {
                "name": "দেবহাটা",
                "nameEn": "দেবহাটা"
              },
              {
                "name": "পারুলিয়া",
                "nameEn": "পারুলিয়া"
              },
              {
                "name": "কুলিয়া",
                "nameEn": "কুলিয়া"
              },
              {
                "name": "সখিপুর",
                "nameEn": "সখিপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কলারোয়া উপজেলা",
            "nameEn": "Kalaroa",
            "unions": [
              {
                "name": "কলারোয়া",
                "nameEn": "কলারোয়া"
              },
              {
                "name": "চান্দনগর",
                "nameEn": "চান্দনগর"
              },
              {
                "name": "সোনাবাড়িয়া",
                "nameEn": "সোনাবাড়িয়া"
              },
              {
                "name": "কেড়াগাছি",
                "nameEn": "কেড়াগাছি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কালীগঞ্জ উপজেলা",
            "nameEn": "Kaliganj",
            "unions": [
              {
                "name": "Kaliganj সদর",
                "nameEn": "Kaliganj Sadar"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "তালা উপজেলা",
            "nameEn": "Satkhira Sadar",
            "unions": [
              {
                "name": "সাতক্ষীরা সদর",
                "nameEn": "সাতক্ষীরা সদর"
              },
              {
                "name": "আলীপুর",
                "nameEn": "আলীপুর"
              },
              {
                "name": "ঝাউডাঙ্গা",
                "nameEn": "ঝাউডাঙ্গা"
              },
              {
                "name": "ব্রহ্মরাজপুর",
                "nameEn": "ব্রহ্মরাজপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "দেবহাটা উপজেলা",
            "nameEn": "Shyamnagar",
            "unions": [
              {
                "name": "শ্যামনগর",
                "nameEn": "শ্যামনগর"
              },
              {
                "name": "বুড়িগোয়ালিনী",
                "nameEn": "বুড়িগোয়ালিনী"
              },
              {
                "name": "পদ্মপুকুর",
                "nameEn": "পদ্মপুকুর"
              },
              {
                "name": "মুন্সিগঞ্জ",
                "nameEn": "মুন্সিগঞ্জ"
              },
              {
                "name": "সুন্দরবন",
                "nameEn": "সুন্দরবন"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "শ্যামনগর উপজেলা",
            "nameEn": "Tala",
            "unions": [
              {
                "name": "তালা",
                "nameEn": "তালা"
              },
              {
                "name": "খলিষখালী",
                "nameEn": "খলিষখালী"
              },
              {
                "name": "জাতপুর",
                "nameEn": "জাতপুর"
              },
              {
                "name": "মাগুরা",
                "nameEn": "মাগুরা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Kalaroa পৌরসভা",
            "nameEn": "Kalaroa Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Tala পৌরসভা",
            "nameEn": "Tala Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Shyamnagar পৌরসভা",
            "nameEn": "Shyamnagar Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Debhata পৌরসভা",
            "nameEn": "Debhata Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      }
    ]
  },
  {
    "name": "চট্টগ্রাম",
    "nameEn": "Chattogram",
    "districts": [
      {
        "name": "বি.বাড়িয়া",
        "nameEn": "B.baria",
        "upazilas": [
          {
            "name": "ব্রাহ্মণবাড়িয়া পৌরসভা",
            "nameEn": "Brahmanbaria Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              },
              {
                "name": "ওয়ার্ড নং-10",
                "nameEn": "Ward No-10"
              },
              {
                "name": "ওয়ার্ড নং-11",
                "nameEn": "Ward No-11"
              },
              {
                "name": "ওয়ার্ড নং-12",
                "nameEn": "Ward No-12"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "ব্রাহ্মণবাড়িয়া সদর উপজেলা",
            "nameEn": "Akhaura",
            "unions": [
              {
                "name": "আখাউড়া",
                "nameEn": "আখাউড়া"
              },
              {
                "name": "মোগলটুলী",
                "nameEn": "মোগলটুলী"
              },
              {
                "name": "ধরখার",
                "nameEn": "ধরখার"
              },
              {
                "name": "দেবগ্রাম",
                "nameEn": "দেবগ্রাম"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "নবীনগর উপজেলা",
            "nameEn": "Ashuganj",
            "unions": [
              {
                "name": "আশুগঞ্জ",
                "nameEn": "আশুগঞ্জ"
              },
              {
                "name": "লালপুর",
                "nameEn": "লালপুর"
              },
              {
                "name": "তালশহর",
                "nameEn": "তালশহর"
              },
              {
                "name": "আড়াইবাড়ী",
                "nameEn": "আড়াইবাড়ী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "আশুগঞ্জ উপজেলা",
            "nameEn": "B.Baria Sadar",
            "unions": [
              {
                "name": "ব্রাহ্মণবাড়িয়া সদর",
                "nameEn": "ব্রাহ্মণবাড়িয়া সদর"
              },
              {
                "name": "মাজাইরা",
                "nameEn": "মাজাইরা"
              },
              {
                "name": "কুটি",
                "nameEn": "কুটি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "আখাউড়া উপজেলা",
            "nameEn": "Bancharampur",
            "unions": [
              {
                "name": "বাঞ্ছারামপুর",
                "nameEn": "বাঞ্ছারামপুর"
              },
              {
                "name": "সুজাতপুর",
                "nameEn": "সুজাতপুর"
              },
              {
                "name": "রূপসদী",
                "nameEn": "রূপসদী"
              },
              {
                "name": "চাতলপুর",
                "nameEn": "চাতলপুর"
              },
              {
                "name": "দরিকান্দী",
                "nameEn": "দরিকান্দী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কসবা উপজেলা",
            "nameEn": "Bijoynagar",
            "unions": [
              {
                "name": "বিজয়নগর",
                "nameEn": "বিজয়নগর"
              },
              {
                "name": "ফান্দাউক",
                "nameEn": "ফান্দাউক"
              },
              {
                "name": "মেড্ডা",
                "nameEn": "মেড্ডা"
              },
              {
                "name": "হরষপুর",
                "nameEn": "হরষপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বিজয়নগর উপজেলা",
            "nameEn": "Kasba",
            "unions": [
              {
                "name": "কসবা",
                "nameEn": "কসবা"
              },
              {
                "name": "মেহারী",
                "nameEn": "মেহারী"
              },
              {
                "name": "বুধন্তি",
                "nameEn": "বুধন্তি"
              },
              {
                "name": "কুল্লাপাথর",
                "nameEn": "কুল্লাপাথর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "সরাইল উপজেলা",
            "nameEn": "Nabinagar",
            "unions": [
              {
                "name": "নবীনগর",
                "nameEn": "নবীনগর"
              },
              {
                "name": "বিটঘর",
                "nameEn": "বিটঘর"
              },
              {
                "name": "শাহবাজপুর",
                "nameEn": "শাহবাজপুর"
              },
              {
                "name": "ইব্রাহিমপুর",
                "nameEn": "ইব্রাহিমপুর"
              },
              {
                "name": "রতনপুর",
                "nameEn": "রতনপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "নাসিরনগর উপজেলা",
            "nameEn": "Nasirnagar",
            "unions": [
              {
                "name": "নাসিরনগর",
                "nameEn": "নাসিরনগর"
              },
              {
                "name": "চাতলপুর",
                "nameEn": "চাতলপুর"
              },
              {
                "name": "গোকর্ণ",
                "nameEn": "গোকর্ণ"
              },
              {
                "name": "হরিপুর",
                "nameEn": "হরিপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বাঞ্ছারামপুর উপজেলা",
            "nameEn": "Sarail",
            "unions": [
              {
                "name": "সরাইল",
                "nameEn": "সরাইল"
              },
              {
                "name": "শাহবাজপুর",
                "nameEn": "শাহবাজপুর"
              },
              {
                "name": "নোয়াগাঁও",
                "nameEn": "নোয়াগাঁও"
              },
              {
                "name": "শাহজাদাপুর",
                "nameEn": "শাহজাদাপুর"
              }
            ],
            "type": "upazila"
          }
        ]
      },
      {
        "name": "বান্দরবান",
        "nameEn": "Bandarban",
        "upazilas": [
          {
            "name": "বান্দরবান পৌরসভা",
            "nameEn": "Bandarban Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "বান্দরবন সদর",
            "nameEn": "Alikadam",
            "unions": [
              {
                "name": "আলীকদম",
                "nameEn": "আলীকদম"
              },
              {
                "name": "চৈক্ষ্যং",
                "nameEn": "চৈক্ষ্যং"
              },
              {
                "name": "নয়াপাটং",
                "nameEn": "নয়াপাটং"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "আলীকদম",
            "nameEn": "Bandarban Sadar",
            "unions": [
              {
                "name": "বান্দরবান সদর",
                "nameEn": "বান্দরবান সদর"
              },
              {
                "name": "কুহালং",
                "nameEn": "কুহালং"
              },
              {
                "name": "রাজবিলা",
                "nameEn": "রাজবিলা"
              },
              {
                "name": "সুয়ালক",
                "nameEn": "সুয়ালক"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "থানচি",
            "nameEn": "Lama",
            "unions": [
              {
                "name": "লামা",
                "nameEn": "লামা"
              },
              {
                "name": "রূপসীপাড়া",
                "nameEn": "রূপসীপাড়া"
              },
              {
                "name": "ফাঁসিয়াখালী",
                "nameEn": "ফাঁসিয়াখালী"
              },
              {
                "name": "গজালিয়া",
                "nameEn": "গজালিয়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "নাইক্ষ্যংছড়ি",
            "nameEn": "Naikhyongchari",
            "unions": [
              {
                "name": "নাইক্ষ্যংছড়ি",
                "nameEn": "নাইক্ষ্যংছড়ি"
              },
              {
                "name": "ঘুমধুম",
                "nameEn": "ঘুমধুম"
              },
              {
                "name": "দোছড়ি",
                "nameEn": "দোছড়ি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "রুমা",
            "nameEn": "Rowangchari",
            "unions": [
              {
                "name": "রোয়াংছড়ি",
                "nameEn": "রোয়াংছড়ি"
              },
              {
                "name": "তারাচা",
                "nameEn": "তারাচা"
              },
              {
                "name": "আলেখ্যং",
                "nameEn": "আলেখ্যং"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "রোয়াংছড়ি",
            "nameEn": "Ruma",
            "unions": [
              {
                "name": "রুমা",
                "nameEn": "রুমা"
              },
              {
                "name": "গালেংয়া",
                "nameEn": "গালেংয়া"
              },
              {
                "name": "রেমাক্রী",
                "nameEn": "রেমাক্রী"
              },
              {
                "name": "পাইন্দু",
                "nameEn": "পাইন্দু"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "লামা",
            "nameEn": "Thanchi",
            "unions": [
              {
                "name": "থানচি",
                "nameEn": "থানচি"
              },
              {
                "name": "বলীপাড়া",
                "nameEn": "বলীপাড়া"
              },
              {
                "name": "তিন্দু",
                "nameEn": "তিন্দু"
              },
              {
                "name": "রেমাক্রী প্রাংসা",
                "nameEn": "রেমাক্রী প্রাংসা"
              }
            ],
            "type": "upazila"
          }
        ]
      },
      {
        "name": "চাঁদপুর",
        "nameEn": "Chandpur",
        "upazilas": [
          {
            "name": "চাঁদপুর পৌরসভা",
            "nameEn": "Chandpur Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "চাঁদপুর সদর",
            "nameEn": "Chandpur Sadar",
            "unions": [
              {
                "name": "চাঁদপুর সদর",
                "nameEn": "চাঁদপুর সদর"
              },
              {
                "name": "বাজাপুর",
                "nameEn": "বাজাপুর"
              },
              {
                "name": "রাজরাজেশ্বর",
                "nameEn": "রাজরাজেশ্বর"
              },
              {
                "name": "হাজীগঞ্জ",
                "nameEn": "হাজীগঞ্জ"
              },
              {
                "name": "মতলব",
                "nameEn": "মতলব"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ফরিদগঞ্জ",
            "nameEn": "Faridganj",
            "unions": [
              {
                "name": "ফরিদগঞ্জ",
                "nameEn": "ফরিদগঞ্জ"
              },
              {
                "name": "গান্ধীগ্রাম",
                "nameEn": "গান্ধীগ্রাম"
              },
              {
                "name": "সুবিদপুর",
                "nameEn": "সুবিদপুর"
              },
              {
                "name": "সালামাবাদ",
                "nameEn": "সালামাবাদ"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "হাজীগঞ্জ",
            "nameEn": "Haimchar",
            "unions": [
              {
                "name": "হাইমচর",
                "nameEn": "হাইমচর"
              },
              {
                "name": "নিলকমল",
                "nameEn": "নিলকমল"
              },
              {
                "name": "চরমাটুয়া",
                "nameEn": "চরমাটুয়া"
              },
              {
                "name": "আলগী",
                "nameEn": "আলগী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "হাইমচর",
            "nameEn": "Haziganj",
            "unions": [
              {
                "name": "হাজীগঞ্জ",
                "nameEn": "হাজীগঞ্জ"
              },
              {
                "name": "রাজাপুর",
                "nameEn": "রাজাপুর"
              },
              {
                "name": "বাকিলা",
                "nameEn": "বাকিলা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "শাহরাস্তি",
            "nameEn": "Kachua",
            "unions": [
              {
                "name": "কচুয়া",
                "nameEn": "কচুয়া"
              },
              {
                "name": "বদরপুর",
                "nameEn": "বদরপুর"
              },
              {
                "name": "গোয়ালবাথান",
                "nameEn": "গোয়ালবাথান"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "শাহরাস্তি",
            "nameEn": "Dakshin",
            "unions": [
              {
                "name": "মতলব দক্ষিণ",
                "nameEn": "মতলব দক্ষিণ"
              },
              {
                "name": "উপাদি",
                "nameEn": "উপাদি"
              },
              {
                "name": "নয়নপুর",
                "nameEn": "নয়নপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Hajiganj পৌরসভা",
            "nameEn": "Hajiganj Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Shahrasti পৌরসভা",
            "nameEn": "Shahrasti Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Matlab পৌরসভা",
            "nameEn": "Matlab Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "চট্টগ্রাম",
        "nameEn": "Chattogram",
        "upazilas": [
          {
            "name": "চট্টগ্রাম সিটি কর্পোরেশন",
            "nameEn": "Chattogram City Corporation",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              },
              {
                "name": "ওয়ার্ড নং-10",
                "nameEn": "Ward No-10"
              },
              {
                "name": "ওয়ার্ড নং-11",
                "nameEn": "Ward No-11"
              },
              {
                "name": "ওয়ার্ড নং-12",
                "nameEn": "Ward No-12"
              },
              {
                "name": "ওয়ার্ড নং-13",
                "nameEn": "Ward No-13"
              },
              {
                "name": "ওয়ার্ড নং-14",
                "nameEn": "Ward No-14"
              },
              {
                "name": "ওয়ার্ড নং-15",
                "nameEn": "Ward No-15"
              },
              {
                "name": "ওয়ার্ড নং-16",
                "nameEn": "Ward No-16"
              },
              {
                "name": "ওয়ার্ড নং-17",
                "nameEn": "Ward No-17"
              },
              {
                "name": "ওয়ার্ড নং-18",
                "nameEn": "Ward No-18"
              },
              {
                "name": "ওয়ার্ড নং-19",
                "nameEn": "Ward No-19"
              },
              {
                "name": "ওয়ার্ড নং-20",
                "nameEn": "Ward No-20"
              },
              {
                "name": "ওয়ার্ড নং-21",
                "nameEn": "Ward No-21"
              },
              {
                "name": "ওয়ার্ড নং-22",
                "nameEn": "Ward No-22"
              },
              {
                "name": "ওয়ার্ড নং-23",
                "nameEn": "Ward No-23"
              },
              {
                "name": "ওয়ার্ড নং-24",
                "nameEn": "Ward No-24"
              },
              {
                "name": "ওয়ার্ড নং-25",
                "nameEn": "Ward No-25"
              },
              {
                "name": "ওয়ার্ড নং-26",
                "nameEn": "Ward No-26"
              },
              {
                "name": "ওয়ার্ড নং-27",
                "nameEn": "Ward No-27"
              },
              {
                "name": "ওয়ার্ড নং-28",
                "nameEn": "Ward No-28"
              },
              {
                "name": "ওয়ার্ড নং-29",
                "nameEn": "Ward No-29"
              },
              {
                "name": "ওয়ার্ড নং-30",
                "nameEn": "Ward No-30"
              },
              {
                "name": "ওয়ার্ড নং-31",
                "nameEn": "Ward No-31"
              },
              {
                "name": "ওয়ার্ড নং-32",
                "nameEn": "Ward No-32"
              },
              {
                "name": "ওয়ার্ড নং-33",
                "nameEn": "Ward No-33"
              },
              {
                "name": "ওয়ার্ড নং-34",
                "nameEn": "Ward No-34"
              },
              {
                "name": "ওয়ার্ড নং-35",
                "nameEn": "Ward No-35"
              },
              {
                "name": "ওয়ার্ড নং-36",
                "nameEn": "Ward No-36"
              },
              {
                "name": "ওয়ার্ড নং-37",
                "nameEn": "Ward No-37"
              },
              {
                "name": "ওয়ার্ড নং-38",
                "nameEn": "Ward No-38"
              },
              {
                "name": "ওয়ার্ড নং-39",
                "nameEn": "Ward No-39"
              },
              {
                "name": "ওয়ার্ড নং-40",
                "nameEn": "Ward No-40"
              },
              {
                "name": "ওয়ার্ড নং-41",
                "nameEn": "Ward No-41"
              }
            ],
            "type": "city_corporation"
          },
          {
            "name": "আনোয়ারা উপজেলা",
            "nameEn": "Anwara",
            "unions": [
              {
                "name": "আনোয়ারা",
                "nameEn": "আনোয়ারা"
              },
              {
                "name": "চাহার প্রেমধাম",
                "nameEn": "চাহার প্রেমধাম"
              },
              {
                "name": "বাড়ৈয়ারহাট",
                "nameEn": "বাড়ৈয়ারহাট"
              },
              {
                "name": "হাইলধর",
                "nameEn": "হাইলধর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কর্ণফুলি উপজেলা",
            "nameEn": "Banskhali",
            "unions": [
              {
                "name": "বাঁশখালী",
                "nameEn": "বাঁশখালী"
              },
              {
                "name": "শেখেরখীল",
                "nameEn": "শেখেরখীল"
              },
              {
                "name": "সমিতিরহাট",
                "nameEn": "সমিতিরহাট"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "চন্দনাইশ উপজেলা",
            "nameEn": "Boalkhali",
            "unions": [
              {
                "name": "বোয়ালখালী",
                "nameEn": "বোয়ালখালী"
              },
              {
                "name": "সারৈকাইন",
                "nameEn": "সারৈকাইন"
              },
              {
                "name": "কধুরখীল",
                "nameEn": "কধুরখীল"
              },
              {
                "name": "পোপাদিয়া",
                "nameEn": "পোপাদিয়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "পটিয়া উপজেলা",
            "nameEn": "Chandanish",
            "unions": [
              {
                "name": "চন্দনাইশ",
                "nameEn": "চন্দনাইশ"
              },
              {
                "name": "ধোপাছড়ি",
                "nameEn": "ধোপাছড়ি"
              },
              {
                "name": "হাশিমপুর",
                "nameEn": "হাশিমপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ফটিকছড়ি উপজেলা",
            "nameEn": "Fatikchari",
            "unions": [
              {
                "name": "ফটিকছড়ি",
                "nameEn": "ফটিকছড়ি"
              },
              {
                "name": "নানুপুর",
                "nameEn": "নানুপুর"
              },
              {
                "name": "পাহাড়তলী",
                "nameEn": "পাহাড়তলী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বাঁশখালী উপজেলা",
            "nameEn": "Hathazari",
            "unions": [
              {
                "name": "হাটহাজারী",
                "nameEn": "হাটহাজারী"
              },
              {
                "name": "গড়দুয়ারা",
                "nameEn": "গড়দুয়ারা"
              },
              {
                "name": "মেখল",
                "nameEn": "মেখল"
              },
              {
                "name": "চিকনদণ্ডী",
                "nameEn": "চিকনদণ্ডী"
              },
              {
                "name": "ফতেয়াবাদ",
                "nameEn": "ফতেয়াবাদ"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বোয়ালখালী উপজেলা",
            "nameEn": "Karnaphuli",
            "unions": [
              {
                "name": "কর্ণফুলী",
                "nameEn": "কর্ণফুলী"
              },
              {
                "name": "চরপাথরঘাটা",
                "nameEn": "চরপাথরঘাটা"
              },
              {
                "name": "জুলদা",
                "nameEn": "জুলদা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মীরসরাই উপজেলা",
            "nameEn": "Lohagara",
            "unions": [
              {
                "name": "Lohagara সদর",
                "nameEn": "Lohagara Sadar"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "রাউজান উপজেলা",
            "nameEn": "Mirsharai",
            "unions": [
              {
                "name": "মিরসরাই",
                "nameEn": "মিরসরাই"
              },
              {
                "name": "মৈষভান্ডার",
                "nameEn": "মৈষভান্ডার"
              },
              {
                "name": "সাহেরখালী",
                "nameEn": "সাহেরখালী"
              },
              {
                "name": "হিঙ্গুলী",
                "nameEn": "হিঙ্গুলী"
              },
              {
                "name": "করেরহাট",
                "nameEn": "করেরহাট"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "রাঙ্গুনিয়া উপজেলা",
            "nameEn": "Patiya",
            "unions": [
              {
                "name": "পটিয়া",
                "nameEn": "পটিয়া"
              },
              {
                "name": "হাইদগাঁও",
                "nameEn": "হাইদগাঁও"
              },
              {
                "name": "ছনহরা",
                "nameEn": "ছনহরা"
              },
              {
                "name": "শোভনদণ্ডী",
                "nameEn": "শোভনদণ্ডী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "লোহাগাড়া উপজেলা",
            "nameEn": "Rangunia",
            "unions": [
              {
                "name": "রাঙ্গুনিয়া",
                "nameEn": "রাঙ্গুনিয়া"
              },
              {
                "name": "পোমরা",
                "nameEn": "পোমরা"
              },
              {
                "name": "ইছানগর",
                "nameEn": "ইছানগর"
              },
              {
                "name": "পদুয়া",
                "nameEn": "পদুয়া"
              },
              {
                "name": "মরিয়মনগর",
                "nameEn": "মরিয়মনগর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "সন্দ্বীপ উপজেলা",
            "nameEn": "Raojan",
            "unions": [
              {
                "name": "রাউজান",
                "nameEn": "রাউজান"
              },
              {
                "name": "পাহাড়তলী",
                "nameEn": "পাহাড়তলী"
              },
              {
                "name": "গহিরা",
                "nameEn": "গহিরা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "সাতকানিয়া উপজেলা",
            "nameEn": "Sandwip",
            "unions": [
              {
                "name": "সন্দ্বীপ",
                "nameEn": "সন্দ্বীপ"
              },
              {
                "name": "হরিষপুর",
                "nameEn": "হরিষপুর"
              },
              {
                "name": "বাউলিয়া",
                "nameEn": "বাউলিয়া"
              },
              {
                "name": "আমানুল্লাহ",
                "nameEn": "আমানুল্লাহ"
              },
              {
                "name": "সারিকাইত",
                "nameEn": "সারিকাইত"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "সীতাকুণ্ড উপজেলা",
            "nameEn": "Satkania",
            "unions": [
              {
                "name": "সাতকানিয়া",
                "nameEn": "সাতকানিয়া"
              },
              {
                "name": "বাজালিয়া",
                "nameEn": "বাজালিয়া"
              },
              {
                "name": "ধেমশা",
                "nameEn": "ধেমশা"
              },
              {
                "name": "কালিয়াইশ",
                "nameEn": "কালিয়াইশ"
              },
              {
                "name": "মাদার্শা",
                "nameEn": "মাদার্শা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "হাটহাজারী উপজেলা",
            "nameEn": "Sitakunda",
            "unions": [
              {
                "name": "সীতাকুণ্ড",
                "nameEn": "সীতাকুণ্ড"
              },
              {
                "name": "বড়কমল",
                "nameEn": "বড়কমল"
              },
              {
                "name": "কুমিরা",
                "nameEn": "কুমিরা"
              },
              {
                "name": "সোনাইছড়ি",
                "nameEn": "সোনাইছড়ি"
              },
              {
                "name": "বাড়বকুন্ড",
                "nameEn": "বাড়বকুন্ড"
              }
            ],
            "type": "upazila"
          }
        ]
      },
      {
        "name": "কক্সবাজার",
        "nameEn": "Cox's bazar",
        "upazilas": [
          {
            "name": "কক্সবাজার পৌরসভা",
            "nameEn": "Cox's Bazar Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "কক্সবাজার সদর",
            "nameEn": "Chakoria",
            "unions": [
              {
                "name": "চকরিয়া",
                "nameEn": "চকরিয়া"
              },
              {
                "name": "কৈয়ারবিল",
                "nameEn": "কৈয়ারবিল"
              },
              {
                "name": "ঢেমুশিয়া",
                "nameEn": "ঢেমুশিয়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "উখিয়া",
            "nameEn": "Cox'S Bazar Sadar",
            "unions": [
              {
                "name": "কক্সবাজার সদর",
                "nameEn": "কক্সবাজার সদর"
              },
              {
                "name": "ঝিলংজা",
                "nameEn": "ঝিলংজা"
              },
              {
                "name": "ইদগাঁও",
                "nameEn": "ইদগাঁও"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কুতুবদিয়া",
            "nameEn": "Kutubdia",
            "unions": [
              {
                "name": "কুতুবদিয়া",
                "nameEn": "কুতুবদিয়া"
              },
              {
                "name": "আলী আকবরদেল",
                "nameEn": "আলী আকবরদেল"
              },
              {
                "name": "ধুরুং",
                "nameEn": "ধুরুং"
              },
              {
                "name": "লেমশীখালী",
                "nameEn": "লেমশীখালী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "চকরিয়া",
            "nameEn": "Moheskhali",
            "unions": [
              {
                "name": "মহেশখালী",
                "nameEn": "মহেশখালী"
              },
              {
                "name": "কুতুবজোম",
                "nameEn": "কুতুবজোম"
              },
              {
                "name": "মাতারবাড়ী",
                "nameEn": "মাতারবাড়ী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "টেকনাফ",
            "nameEn": "Pekua",
            "unions": [
              {
                "name": "পেকুয়া",
                "nameEn": "পেকুয়া"
              },
              {
                "name": "মগনামা",
                "nameEn": "মগনামা"
              },
              {
                "name": "শীলখালী",
                "nameEn": "শীলখালী"
              },
              {
                "name": "তাতাপাং",
                "nameEn": "তাতাপাং"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "পেকুয়া",
            "nameEn": "Ramu",
            "unions": [
              {
                "name": "রামু",
                "nameEn": "রামু"
              },
              {
                "name": "কাউয়ারখোপ",
                "nameEn": "কাউয়ারখোপ"
              },
              {
                "name": "রাজারকুল",
                "nameEn": "রাজারকুল"
              },
              {
                "name": "খুনিয়াপালং",
                "nameEn": "খুনিয়াপালং"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মহেশখালী",
            "nameEn": "Teknaf",
            "unions": [
              {
                "name": "টেকনাফ",
                "nameEn": "টেকনাফ"
              },
              {
                "name": "জাদিমুরা",
                "nameEn": "জাদিমুরা"
              },
              {
                "name": "হোয়াইক্যং",
                "nameEn": "হোয়াইক্যং"
              },
              {
                "name": "বাহারছড়া",
                "nameEn": "বাহারছড়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "রামু",
            "nameEn": "Ukhiya",
            "unions": [
              {
                "name": "Ukhiya সদর",
                "nameEn": "Ukhiya Sadar"
              }
            ],
            "type": "upazila"
          }
        ]
      },
      {
        "name": "কুমিল্লা",
        "nameEn": "Cumilla",
        "upazilas": [
          {
            "name": "কুমিল্লা সিটি কর্পোরেশন",
            "nameEn": "Cumilla City Corporation",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              },
              {
                "name": "ওয়ার্ড নং-10",
                "nameEn": "Ward No-10"
              },
              {
                "name": "ওয়ার্ড নং-11",
                "nameEn": "Ward No-11"
              },
              {
                "name": "ওয়ার্ড নং-12",
                "nameEn": "Ward No-12"
              },
              {
                "name": "ওয়ার্ড নং-13",
                "nameEn": "Ward No-13"
              },
              {
                "name": "ওয়ার্ড নং-14",
                "nameEn": "Ward No-14"
              },
              {
                "name": "ওয়ার্ড নং-15",
                "nameEn": "Ward No-15"
              },
              {
                "name": "ওয়ার্ড নং-16",
                "nameEn": "Ward No-16"
              },
              {
                "name": "ওয়ার্ড নং-17",
                "nameEn": "Ward No-17"
              },
              {
                "name": "ওয়ার্ড নং-18",
                "nameEn": "Ward No-18"
              },
              {
                "name": "ওয়ার্ড নং-19",
                "nameEn": "Ward No-19"
              },
              {
                "name": "ওয়ার্ড নং-20",
                "nameEn": "Ward No-20"
              },
              {
                "name": "ওয়ার্ড নং-21",
                "nameEn": "Ward No-21"
              },
              {
                "name": "ওয়ার্ড নং-22",
                "nameEn": "Ward No-22"
              },
              {
                "name": "ওয়ার্ড নং-23",
                "nameEn": "Ward No-23"
              },
              {
                "name": "ওয়ার্ড নং-24",
                "nameEn": "Ward No-24"
              },
              {
                "name": "ওয়ার্ড নং-25",
                "nameEn": "Ward No-25"
              },
              {
                "name": "ওয়ার্ড নং-26",
                "nameEn": "Ward No-26"
              },
              {
                "name": "ওয়ার্ড নং-27",
                "nameEn": "Ward No-27"
              }
            ],
            "type": "city_corporation"
          },
          {
            "name": "বরুড়া উপজেলা",
            "nameEn": "Barura",
            "unions": [
              {
                "name": "বরুড়া",
                "nameEn": "বরুড়া"
              },
              {
                "name": "মোকাম",
                "nameEn": "মোকাম"
              },
              {
                "name": "জগৎমল্লিকা",
                "nameEn": "জগৎমল্লিকা"
              },
              {
                "name": "আদরা",
                "nameEn": "আদরা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ব্রাহ্মনপাড়া উপজেলা",
            "nameEn": "Brahmanpara",
            "unions": [
              {
                "name": "ব্রাহ্মণপাড়া",
                "nameEn": "ব্রাহ্মণপাড়া"
              },
              {
                "name": "সিদ্ধিরগঞ্জ",
                "nameEn": "সিদ্ধিরগঞ্জ"
              },
              {
                "name": "মাধবপুর",
                "nameEn": "মাধবপুর"
              },
              {
                "name": "শশীদল",
                "nameEn": "শশীদল"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বুড়িচং উপজেলা",
            "nameEn": "Burichong",
            "unions": [
              {
                "name": "বুড়িচং",
                "nameEn": "বুড়িচং"
              },
              {
                "name": "ময়নামতি",
                "nameEn": "ময়নামতি"
              },
              {
                "name": "রাজাপুর",
                "nameEn": "রাজাপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "চান্দিনা উপজেলা",
            "nameEn": "Chandina",
            "unions": [
              {
                "name": "চান্দিনা",
                "nameEn": "চান্দিনা"
              },
              {
                "name": "মাধাইয়া",
                "nameEn": "মাধাইয়া"
              },
              {
                "name": "বাতিষা",
                "nameEn": "বাতিষা"
              },
              {
                "name": "মাইজখার",
                "nameEn": "মাইজখার"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "চৌদ্দগ্রাম উপজেলা",
            "nameEn": "Chouddagram",
            "unions": [
              {
                "name": "চৌদ্দগ্রাম",
                "nameEn": "চৌদ্দগ্রাম"
              },
              {
                "name": "গুণবতী",
                "nameEn": "গুণবতী"
              },
              {
                "name": "জগন্নাথপুর",
                "nameEn": "জগন্নাথপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কুমিল্লা- সদর",
            "nameEn": "Cumilla Sadar",
            "unions": [
              {
                "name": "কুমিল্লা সদর",
                "nameEn": "কুমিল্লা সদর"
              },
              {
                "name": "কোটবাড়ী",
                "nameEn": "কোটবাড়ী"
              },
              {
                "name": "বিজয়পুর",
                "nameEn": "বিজয়পুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "সদর দক্ষিন উপজেলা",
            "nameEn": "Cumilla Sadar Daksin",
            "unions": [
              {
                "name": "কুমিল্লা সদর দক্ষিণ",
                "nameEn": "কুমিল্লা সদর দক্ষিণ"
              },
              {
                "name": "বিজয়পুর",
                "nameEn": "বিজয়পুর"
              },
              {
                "name": "কালিকাপুর",
                "nameEn": "কালিকাপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "দাউদকান্দি উপজেলা",
            "nameEn": "Daudkandi",
            "unions": [
              {
                "name": "দাউদকান্দি",
                "nameEn": "দাউদকান্দি"
              },
              {
                "name": "পদুয়া",
                "nameEn": "পদুয়া"
              },
              {
                "name": "এলাহাবাদ",
                "nameEn": "এলাহাবাদ"
              },
              {
                "name": "সুন্দরপুর",
                "nameEn": "সুন্দরপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "দেবিদ্বার উপজেলা",
            "nameEn": "Debidwar",
            "unions": [
              {
                "name": "দেবিদ্বার",
                "nameEn": "দেবিদ্বার"
              },
              {
                "name": "রাজমেহের",
                "nameEn": "রাজমেহের"
              },
              {
                "name": "এল্লাহাবাদ",
                "nameEn": "এল্লাহাবাদ"
              },
              {
                "name": "ধামতি",
                "nameEn": "ধামতি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "হোমনা উপজেলা",
            "nameEn": "Homna",
            "unions": [
              {
                "name": "হোমনা",
                "nameEn": "হোমনা"
              },
              {
                "name": "ঘাগটিয়া",
                "nameEn": "ঘাগটিয়া"
              },
              {
                "name": "নিলখী",
                "nameEn": "নিলখী"
              },
              {
                "name": "আশরাফপুর",
                "nameEn": "আশরাফপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "লাকসাম উপজেলা",
            "nameEn": "Laksham",
            "unions": [
              {
                "name": "লাকসাম",
                "nameEn": "লাকসাম"
              },
              {
                "name": "মুদাফরগঞ্জ",
                "nameEn": "মুদাফরগঞ্জ"
              },
              {
                "name": "কাচুয়া",
                "nameEn": "কাচুয়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "লালমাই উপজেলা",
            "nameEn": "Lalmai",
            "unions": [
              {
                "name": "লালমাই",
                "nameEn": "লালমাই"
              },
              {
                "name": "জগন্নাথদিঘী",
                "nameEn": "জগন্নাথদিঘী"
              },
              {
                "name": "কাশীনাথপুর",
                "nameEn": "কাশীনাথপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মেঘনা উপজেলা",
            "nameEn": "Meghna",
            "unions": [
              {
                "name": "মেঘনা",
                "nameEn": "মেঘনা"
              },
              {
                "name": "বাটামারা",
                "nameEn": "বাটামারা"
              },
              {
                "name": "নারায়ণপুর",
                "nameEn": "নারায়ণপুর"
              },
              {
                "name": "রামচন্দ্রপুর",
                "nameEn": "রামচন্দ্রপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মনোহরগঞ্জ উপজেলা",
            "nameEn": "Monohorganj",
            "unions": [
              {
                "name": "মনোহরগঞ্জ",
                "nameEn": "মনোহরগঞ্জ"
              },
              {
                "name": "বেগমপুর",
                "nameEn": "বেগমপুর"
              },
              {
                "name": "খিলা",
                "nameEn": "খিলা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মুরাদনগর উপজেলা",
            "nameEn": "Muradnagar",
            "unions": [
              {
                "name": "মুরাদনগর",
                "nameEn": "মুরাদনগর"
              },
              {
                "name": "রাজাপুর",
                "nameEn": "রাজাপুর"
              },
              {
                "name": "টনকি",
                "nameEn": "টনকি"
              },
              {
                "name": "পাহাড়পুর",
                "nameEn": "পাহাড়পুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "নাঙ্গলকোট উপজেলা",
            "nameEn": "Nangalkot",
            "unions": [
              {
                "name": "নাঙ্গলকোট",
                "nameEn": "নাঙ্গলকোট"
              },
              {
                "name": "পেরোল",
                "nameEn": "পেরোল"
              },
              {
                "name": "দৌলতপুর",
                "nameEn": "দৌলতপুর"
              },
              {
                "name": "সাতবাড়িয়া",
                "nameEn": "সাতবাড়িয়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "তিতাস উপজেলা",
            "nameEn": "Titas",
            "unions": [
              {
                "name": "তিতাস",
                "nameEn": "তিতাস"
              },
              {
                "name": "কালিকাপুর",
                "nameEn": "কালিকাপুর"
              },
              {
                "name": "জগৎপুর",
                "nameEn": "জগৎপুর"
              },
              {
                "name": "হোমনা",
                "nameEn": "হোমনা"
              }
            ],
            "type": "upazila"
          }
        ]
      },
      {
        "name": "ফেনী",
        "nameEn": "Feni",
        "upazilas": [
          {
            "name": "ফেনী পৌরসভা",
            "nameEn": "Feni Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "ফেনী সদর",
            "nameEn": "Chhagalniya",
            "unions": [
              {
                "name": "ছাগলনাইয়া",
                "nameEn": "ছাগলনাইয়া"
              },
              {
                "name": "রসুলপুর",
                "nameEn": "রসুলপুর"
              },
              {
                "name": "শুভপুর",
                "nameEn": "শুভপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "দাগনভূঁইয়া",
            "nameEn": "Daganbhuiyan",
            "unions": [
              {
                "name": "দাগনভূঞা",
                "nameEn": "দাগনভূঞা"
              },
              {
                "name": "সিন্দুরপুর",
                "nameEn": "সিন্দুরপুর"
              },
              {
                "name": "ইয়াকুবাবাদ",
                "nameEn": "ইয়াকুবাবাদ"
              },
              {
                "name": "রসুলপুর",
                "nameEn": "রসুলপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "সোনাগাজী",
            "nameEn": "Feni Sadar",
            "unions": [
              {
                "name": "ফেনী সদর",
                "nameEn": "ফেনী সদর"
              },
              {
                "name": "চরপূর্বা",
                "nameEn": "চরপূর্বা"
              },
              {
                "name": "লেমুয়া",
                "nameEn": "লেমুয়া"
              },
              {
                "name": "চরচান্দিয়া",
                "nameEn": "চরচান্দিয়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ছাগলনাইয়া",
            "nameEn": "Fulgazi",
            "unions": [
              {
                "name": "ফুলগাজী",
                "nameEn": "ফুলগাজী"
              },
              {
                "name": "মুন্সিরহাট",
                "nameEn": "মুন্সিরহাট"
              },
              {
                "name": "আমীরাবাদ",
                "nameEn": "আমীরাবাদ"
              },
              {
                "name": "আনন্দপুর",
                "nameEn": "আনন্দপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "পরশুরাম",
            "nameEn": "Porshuram",
            "unions": [
              {
                "name": "পরশুরাম",
                "nameEn": "পরশুরাম"
              },
              {
                "name": "চিতলিয়া",
                "nameEn": "চিতলিয়া"
              },
              {
                "name": "মাদবপুর",
                "nameEn": "মাদবপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ফুলগাজী",
            "nameEn": "Sonagazi",
            "unions": [
              {
                "name": "সোনাগাজী",
                "nameEn": "সোনাগাজী"
              },
              {
                "name": "চরদরবেশ",
                "nameEn": "চরদরবেশ"
              },
              {
                "name": "আমিরাবাদ",
                "nameEn": "আমিরাবাদ"
              },
              {
                "name": "চরচান্দিয়া",
                "nameEn": "চরচান্দিয়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Daganbhuiyan পৌরসভা",
            "nameEn": "Daganbhuiyan Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Sonagazi পৌরসভা",
            "nameEn": "Sonagazi Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Chhagalnaiya পৌরসভা",
            "nameEn": "Chhagalnaiya Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Parshuram পৌরসভা",
            "nameEn": "Parshuram Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "খাগড়াছড়ি",
        "nameEn": "Khagrachari",
        "upazilas": [
          {
            "name": "খাগড়াছড়ি পৌরসভা",
            "nameEn": "Khagrachari Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "খাগড়াছড়ি সদর উপজেলা",
            "nameEn": "Dighinala",
            "unions": [
              {
                "name": "দীঘিনালা",
                "nameEn": "দীঘিনালা"
              },
              {
                "name": "বাবুছড়া",
                "nameEn": "বাবুছড়া"
              },
              {
                "name": "মেরুং",
                "nameEn": "মেরুং"
              },
              {
                "name": "কবাখালী",
                "nameEn": "কবাখালী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "পানছড়ি উপজেলা",
            "nameEn": "Guimara",
            "unions": [
              {
                "name": "গুইমারা",
                "nameEn": "গুইমারা"
              },
              {
                "name": "হাফছড়ি",
                "nameEn": "হাফছড়ি"
              },
              {
                "name": "বোয়ালখালী",
                "nameEn": "বোয়ালখালী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "পানছড়ি উপজেলা",
            "nameEn": "Khagrachari Sadar",
            "unions": [
              {
                "name": "খাগড়াছড়ি সদর",
                "nameEn": "খাগড়াছড়ি সদর"
              },
              {
                "name": "পেরাছড়া",
                "nameEn": "পেরাছড়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মহালছড়ি উপজেলা",
            "nameEn": "Laxmichari",
            "unions": [
              {
                "name": "লক্ষ্মীছড়ি",
                "nameEn": "লক্ষ্মীছড়ি"
              },
              {
                "name": "দুল্যাতলী",
                "nameEn": "দুল্যাতলী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মাটিরাঙ্গা উপজেলা",
            "nameEn": "Mahalchari",
            "unions": [
              {
                "name": "মহালছড়ি",
                "nameEn": "মহালছড়ি"
              },
              {
                "name": "কায়ংঘাট",
                "nameEn": "কায়ংঘাট"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মানিকছড়ি উপজেলা",
            "nameEn": "Manikchari",
            "unions": [
              {
                "name": "মানিকছড়ি",
                "nameEn": "মানিকছড়ি"
              },
              {
                "name": "বাটনাতলী",
                "nameEn": "বাটনাতলী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "রামগড় উপজেলা",
            "nameEn": "Matiranga",
            "unions": [
              {
                "name": "মাটিরাঙ্গা",
                "nameEn": "মাটিরাঙ্গা"
              },
              {
                "name": "তাইন্দং",
                "nameEn": "তাইন্দং"
              },
              {
                "name": "আমতলী",
                "nameEn": "আমতলী"
              },
              {
                "name": "বেলছড়ি",
                "nameEn": "বেলছড়ি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "লক্ষীছড়ি উপজেলা",
            "nameEn": "Panchari",
            "unions": [
              {
                "name": "পানছড়ি",
                "nameEn": "পানছড়ি"
              },
              {
                "name": "লোগাং",
                "nameEn": "লোগাং"
              },
              {
                "name": "চেংমী",
                "nameEn": "চেংমী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "গুইমারা উপজেলা",
            "nameEn": "Ramgarh",
            "unions": [
              {
                "name": "রামগড়",
                "nameEn": "রামগড়"
              },
              {
                "name": "পাতাছড়া",
                "nameEn": "পাতাছড়া"
              },
              {
                "name": "হাফছড়ি",
                "nameEn": "হাফছড়ি"
              }
            ],
            "type": "upazila"
          }
        ]
      },
      {
        "name": "লক্ষ্মীপুর",
        "nameEn": "Laxmipur",
        "upazilas": [
          {
            "name": "লক্ষ্মীপুর পৌরসভা",
            "nameEn": "Lakshmipur Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "লক্ষ্মীপুর",
            "nameEn": "Komol Nagar",
            "unions": [
              {
                "name": "কমলনগর",
                "nameEn": "কমলনগর"
              },
              {
                "name": "চরমার্টিন",
                "nameEn": "চরমার্টিন"
              },
              {
                "name": "পাটারী",
                "nameEn": "পাটারী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "রায়পুর",
            "nameEn": "Laxmipur Sadar",
            "unions": [
              {
                "name": "লক্ষ্মীপুর সদর",
                "nameEn": "লক্ষ্মীপুর সদর"
              },
              {
                "name": "চরশরীফ",
                "nameEn": "চরশরীফ"
              },
              {
                "name": "হাজিরহাট",
                "nameEn": "হাজিরহাট"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "রামগঞ্জ",
            "nameEn": "Raipur",
            "unions": [
              {
                "name": "রায়পুর",
                "nameEn": "রায়পুর"
              },
              {
                "name": "চরবাটা",
                "nameEn": "চরবাটা"
              },
              {
                "name": "নোয়াবাদ",
                "nameEn": "নোয়াবাদ"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "রামগতি",
            "nameEn": "Ramganj",
            "unions": [
              {
                "name": "রামগঞ্জ",
                "nameEn": "রামগঞ্জ"
              },
              {
                "name": "চণ্ডীপুর",
                "nameEn": "চণ্ডীপুর"
              },
              {
                "name": "চরবাদাম",
                "nameEn": "চরবাদাম"
              },
              {
                "name": "কাঞ্চনপুর",
                "nameEn": "কাঞ্চনপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কমলনগর",
            "nameEn": "Ramgati",
            "unions": [
              {
                "name": "রামগতি",
                "nameEn": "রামগতি"
              },
              {
                "name": "চরআলেকজান্ডার",
                "nameEn": "চরআলেকজান্ডার"
              },
              {
                "name": "চরফলকন",
                "nameEn": "চরফলকন"
              },
              {
                "name": "চরলরেন্স",
                "nameEn": "চরলরেন্স"
              }
            ],
            "type": "upazila"
          }
        ]
      },
      {
        "name": "নোয়াখালী",
        "nameEn": "Noakhali",
        "upazilas": [
          {
            "name": "নোয়াখালী পৌরসভা",
            "nameEn": "Noakhali Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "বেগমগঞ্জ",
            "nameEn": "Begumganj",
            "unions": [
              {
                "name": "বেগমগঞ্জ",
                "nameEn": "বেগমগঞ্জ"
              },
              {
                "name": "আলাইয়ারচর",
                "nameEn": "আলাইয়ারচর"
              },
              {
                "name": "দুর্গাপুর",
                "nameEn": "দুর্গাপুর"
              },
              {
                "name": "সোনাইমুড়ী",
                "nameEn": "সোনাইমুড়ী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "চাটখিল",
            "nameEn": "Chatkhil",
            "unions": [
              {
                "name": "চাটখিল",
                "nameEn": "চাটখিল"
              },
              {
                "name": "খিলপাড়া",
                "nameEn": "খিলপাড়া"
              },
              {
                "name": "সাহাপুর",
                "nameEn": "সাহাপুর"
              },
              {
                "name": "রশিদপুর",
                "nameEn": "রশিদপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কোম্পানীগঞ্জ",
            "nameEn": "Companiganj",
            "unions": [
              {
                "name": "কোম্পানীগঞ্জ",
                "nameEn": "কোম্পানীগঞ্জ"
              },
              {
                "name": "চরফকিরা",
                "nameEn": "চরফকিরা"
              },
              {
                "name": "চরএলাহী",
                "nameEn": "চরএলাহী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "হাতিয়া",
            "nameEn": "Hatiya",
            "unions": [
              {
                "name": "হাতিয়া",
                "nameEn": "হাতিয়া"
              },
              {
                "name": "চরকিং",
                "nameEn": "চরকিং"
              },
              {
                "name": "নলচিরা",
                "nameEn": "নলচিরা"
              },
              {
                "name": "সুখচর",
                "nameEn": "সুখচর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কবিরহাট",
            "nameEn": "Kabir Hat",
            "unions": [
              {
                "name": "কবিরহাট",
                "nameEn": "কবিরহাট"
              },
              {
                "name": "রামনারায়ণপুর",
                "nameEn": "রামনারায়ণপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "নোয়াখালী সদর",
            "nameEn": "Noakhali Sadar",
            "unions": [
              {
                "name": "নোয়াখালী সদর",
                "nameEn": "নোয়াখালী সদর"
              },
              {
                "name": "চরজুবিলি",
                "nameEn": "চরজুবিলি"
              },
              {
                "name": "ইউয়েটাবাদ",
                "nameEn": "ইউয়েটাবাদ"
              },
              {
                "name": "বিনোদপুর",
                "nameEn": "বিনোদপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "সেনবাগ",
            "nameEn": "Senbag",
            "unions": [
              {
                "name": "সেনবাগ",
                "nameEn": "সেনবাগ"
              },
              {
                "name": "আরজনগর",
                "nameEn": "আরজনগর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "সোনাইমুড়ী",
            "nameEn": "Sonaimuri",
            "unions": [
              {
                "name": "সোনাইমুড়ী",
                "nameEn": "সোনাইমুড়ী"
              },
              {
                "name": "অগ্রাণী",
                "nameEn": "অগ্রাণী"
              },
              {
                "name": "আমিশাপাড়া",
                "nameEn": "আমিশাপাড়া"
              },
              {
                "name": "চরবাটা",
                "nameEn": "চরবাটা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "সুবর্ণচর",
            "nameEn": "Subarna Char",
            "unions": [
              {
                "name": "সুবর্ণচর",
                "nameEn": "সুবর্ণচর"
              },
              {
                "name": "চরক্লার্ক",
                "nameEn": "চরক্লার্ক"
              },
              {
                "name": "চরওয়াপদা",
                "nameEn": "চরওয়াপদা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Begumganj পৌরসভা",
            "nameEn": "Begumganj Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Senbagh পৌরসভা",
            "nameEn": "Senbagh Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Chatkhil পৌরসভা",
            "nameEn": "Chatkhil Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Companiganj পৌরসভা",
            "nameEn": "Companiganj Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Hatiya পৌরসভা",
            "nameEn": "Hatiya Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "রাঙ্গামাটি",
        "nameEn": "Rangamati",
        "upazilas": [
          {
            "name": "রাঙ্গামাটি পৌরসভা",
            "nameEn": "Rangamati Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "রাঙ্গামাটি সদর",
            "nameEn": "Baghaichari",
            "unions": [
              {
                "name": "বাঘাইছড়ি",
                "nameEn": "বাঘাইছড়ি"
              },
              {
                "name": "সাজেক",
                "nameEn": "সাজেক"
              },
              {
                "name": "মারিশ্যা",
                "nameEn": "মারিশ্যা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "নানিয়ারচর",
            "nameEn": "Barkal",
            "unions": [
              {
                "name": "বরকল",
                "nameEn": "বরকল"
              },
              {
                "name": "ভূষণছড়া",
                "nameEn": "ভূষণছড়া"
              },
              {
                "name": "শুভলং",
                "nameEn": "শুভলং"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "লংগদু",
            "nameEn": "Belaichari",
            "unions": [
              {
                "name": "বিলাইছড়ি",
                "nameEn": "বিলাইছড়ি"
              },
              {
                "name": "ফারুয়া",
                "nameEn": "ফারুয়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বাঘাইছড়ি",
            "nameEn": "Juraichari",
            "unions": [
              {
                "name": "জুরাছড়ি",
                "nameEn": "জুরাছড়ি"
              },
              {
                "name": "বনযোগীছড়া",
                "nameEn": "বনযোগীছড়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বরকল",
            "nameEn": "Kaptai",
            "unions": [
              {
                "name": "কাপ্তাই",
                "nameEn": "কাপ্তাই"
              },
              {
                "name": "চিৎমরম",
                "nameEn": "চিৎমরম"
              },
              {
                "name": "ওয়াগ্গা",
                "nameEn": "ওয়াগ্গা"
              },
              {
                "name": "রাইখালী",
                "nameEn": "রাইখালী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "জুরাছড়ি",
            "nameEn": "Kaukhali",
            "unions": [
              {
                "name": "কাউখালী",
                "nameEn": "কাউখালী"
              },
              {
                "name": "ঘিলাছড়ি",
                "nameEn": "ঘিলাছড়ি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বিলাইছড়ি",
            "nameEn": "Langadu",
            "unions": [
              {
                "name": "লংগদু",
                "nameEn": "লংগদু"
              },
              {
                "name": "মাইনীমুখ",
                "nameEn": "মাইনীমুখ"
              },
              {
                "name": "বগাচাটর",
                "nameEn": "বগাচাটর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "রাজস্থলী",
            "nameEn": "Nanniarchar",
            "unions": [
              {
                "name": "নানিয়ারচর",
                "nameEn": "নানিয়ারচর"
              },
              {
                "name": "বুড়িঘাট",
                "nameEn": "বুড়িঘাট"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কাপ্তাই",
            "nameEn": "Rajosthali",
            "unions": [
              {
                "name": "রাজস্থলী",
                "nameEn": "রাজস্থলী"
              },
              {
                "name": "গাইন্দ্যা",
                "nameEn": "গাইন্দ্যা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কাউখালী",
            "nameEn": "Rangamati Sadar",
            "unions": [
              {
                "name": "রাঙ্গামাটি সদর",
                "nameEn": "রাঙ্গামাটি সদর"
              },
              {
                "name": "সাপছড়ি",
                "nameEn": "সাপছড়ি"
              },
              {
                "name": "কুতুকছড়ি",
                "nameEn": "কুতুকছড়ি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Kaptai পৌরসভা",
            "nameEn": "Kaptai Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Langadu পৌরসভা",
            "nameEn": "Langadu Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      }
    ]
  },
  {
    "name": "ঢাকা",
    "nameEn": "Dhaka",
    "districts": [
      {
        "name": "ঢাকা",
        "nameEn": "Dhaka",
        "upazilas": [
          {
            "name": "ঢাকা দক্ষিণ সিটি কর্পোরেশন",
            "nameEn": "Dhaka South City Corporation",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              },
              {
                "name": "ওয়ার্ড নং-10",
                "nameEn": "Ward No-10"
              },
              {
                "name": "ওয়ার্ড নং-11",
                "nameEn": "Ward No-11"
              },
              {
                "name": "ওয়ার্ড নং-12",
                "nameEn": "Ward No-12"
              },
              {
                "name": "ওয়ার্ড নং-13",
                "nameEn": "Ward No-13"
              },
              {
                "name": "ওয়ার্ড নং-14",
                "nameEn": "Ward No-14"
              },
              {
                "name": "ওয়ার্ড নং-15",
                "nameEn": "Ward No-15"
              },
              {
                "name": "ওয়ার্ড নং-16",
                "nameEn": "Ward No-16"
              },
              {
                "name": "ওয়ার্ড নং-17",
                "nameEn": "Ward No-17"
              },
              {
                "name": "ওয়ার্ড নং-18",
                "nameEn": "Ward No-18"
              },
              {
                "name": "ওয়ার্ড নং-19",
                "nameEn": "Ward No-19"
              },
              {
                "name": "ওয়ার্ড নং-20",
                "nameEn": "Ward No-20"
              },
              {
                "name": "ওয়ার্ড নং-21",
                "nameEn": "Ward No-21"
              },
              {
                "name": "ওয়ার্ড নং-22",
                "nameEn": "Ward No-22"
              },
              {
                "name": "ওয়ার্ড নং-23",
                "nameEn": "Ward No-23"
              },
              {
                "name": "ওয়ার্ড নং-24",
                "nameEn": "Ward No-24"
              },
              {
                "name": "ওয়ার্ড নং-25",
                "nameEn": "Ward No-25"
              },
              {
                "name": "ওয়ার্ড নং-26",
                "nameEn": "Ward No-26"
              },
              {
                "name": "ওয়ার্ড নং-27",
                "nameEn": "Ward No-27"
              },
              {
                "name": "ওয়ার্ড নং-28",
                "nameEn": "Ward No-28"
              },
              {
                "name": "ওয়ার্ড নং-29",
                "nameEn": "Ward No-29"
              },
              {
                "name": "ওয়ার্ড নং-30",
                "nameEn": "Ward No-30"
              },
              {
                "name": "ওয়ার্ড নং-31",
                "nameEn": "Ward No-31"
              },
              {
                "name": "ওয়ার্ড নং-32",
                "nameEn": "Ward No-32"
              },
              {
                "name": "ওয়ার্ড নং-33",
                "nameEn": "Ward No-33"
              },
              {
                "name": "ওয়ার্ড নং-34",
                "nameEn": "Ward No-34"
              },
              {
                "name": "ওয়ার্ড নং-35",
                "nameEn": "Ward No-35"
              },
              {
                "name": "ওয়ার্ড নং-36",
                "nameEn": "Ward No-36"
              },
              {
                "name": "ওয়ার্ড নং-37",
                "nameEn": "Ward No-37"
              },
              {
                "name": "ওয়ার্ড নং-38",
                "nameEn": "Ward No-38"
              },
              {
                "name": "ওয়ার্ড নং-39",
                "nameEn": "Ward No-39"
              },
              {
                "name": "ওয়ার্ড নং-40",
                "nameEn": "Ward No-40"
              },
              {
                "name": "ওয়ার্ড নং-41",
                "nameEn": "Ward No-41"
              },
              {
                "name": "ওয়ার্ড নং-42",
                "nameEn": "Ward No-42"
              },
              {
                "name": "ওয়ার্ড নং-43",
                "nameEn": "Ward No-43"
              },
              {
                "name": "ওয়ার্ড নং-44",
                "nameEn": "Ward No-44"
              },
              {
                "name": "ওয়ার্ড নং-45",
                "nameEn": "Ward No-45"
              },
              {
                "name": "ওয়ার্ড নং-46",
                "nameEn": "Ward No-46"
              },
              {
                "name": "ওয়ার্ড নং-47",
                "nameEn": "Ward No-47"
              },
              {
                "name": "ওয়ার্ড নং-48",
                "nameEn": "Ward No-48"
              },
              {
                "name": "ওয়ার্ড নং-49",
                "nameEn": "Ward No-49"
              },
              {
                "name": "ওয়ার্ড নং-50",
                "nameEn": "Ward No-50"
              },
              {
                "name": "ওয়ার্ড নং-51",
                "nameEn": "Ward No-51"
              },
              {
                "name": "ওয়ার্ড নং-52",
                "nameEn": "Ward No-52"
              },
              {
                "name": "ওয়ার্ড নং-53",
                "nameEn": "Ward No-53"
              },
              {
                "name": "ওয়ার্ড নং-54",
                "nameEn": "Ward No-54"
              },
              {
                "name": "ওয়ার্ড নং-55",
                "nameEn": "Ward No-55"
              },
              {
                "name": "ওয়ার্ড নং-56",
                "nameEn": "Ward No-56"
              },
              {
                "name": "ওয়ার্ড নং-57",
                "nameEn": "Ward No-57"
              },
              {
                "name": "ওয়ার্ড নং-58",
                "nameEn": "Ward No-58"
              },
              {
                "name": "ওয়ার্ড নং-59",
                "nameEn": "Ward No-59"
              },
              {
                "name": "ওয়ার্ড নং-60",
                "nameEn": "Ward No-60"
              },
              {
                "name": "ওয়ার্ড নং-61",
                "nameEn": "Ward No-61"
              },
              {
                "name": "ওয়ার্ড নং-62",
                "nameEn": "Ward No-62"
              },
              {
                "name": "ওয়ার্ড নং-63",
                "nameEn": "Ward No-63"
              },
              {
                "name": "ওয়ার্ড নং-64",
                "nameEn": "Ward No-64"
              },
              {
                "name": "ওয়ার্ড নং-65",
                "nameEn": "Ward No-65"
              },
              {
                "name": "ওয়ার্ড নং-66",
                "nameEn": "Ward No-66"
              },
              {
                "name": "ওয়ার্ড নং-67",
                "nameEn": "Ward No-67"
              },
              {
                "name": "ওয়ার্ড নং-68",
                "nameEn": "Ward No-68"
              },
              {
                "name": "ওয়ার্ড নং-69",
                "nameEn": "Ward No-69"
              },
              {
                "name": "ওয়ার্ড নং-70",
                "nameEn": "Ward No-70"
              },
              {
                "name": "ওয়ার্ড নং-71",
                "nameEn": "Ward No-71"
              },
              {
                "name": "ওয়ার্ড নং-72",
                "nameEn": "Ward No-72"
              },
              {
                "name": "ওয়ার্ড নং-73",
                "nameEn": "Ward No-73"
              },
              {
                "name": "ওয়ার্ড নং-74",
                "nameEn": "Ward No-74"
              },
              {
                "name": "ওয়ার্ড নং-75",
                "nameEn": "Ward No-75"
              }
            ],
            "type": "city_corporation"
          },
          {
            "name": "ঢাকা উত্তর সিটি কর্পোরেশন",
            "nameEn": "Dhaka North City Corporation",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              },
              {
                "name": "ওয়ার্ড নং-10",
                "nameEn": "Ward No-10"
              },
              {
                "name": "ওয়ার্ড নং-11",
                "nameEn": "Ward No-11"
              },
              {
                "name": "ওয়ার্ড নং-12",
                "nameEn": "Ward No-12"
              },
              {
                "name": "ওয়ার্ড নং-13",
                "nameEn": "Ward No-13"
              },
              {
                "name": "ওয়ার্ড নং-14",
                "nameEn": "Ward No-14"
              },
              {
                "name": "ওয়ার্ড নং-15",
                "nameEn": "Ward No-15"
              },
              {
                "name": "ওয়ার্ড নং-16",
                "nameEn": "Ward No-16"
              },
              {
                "name": "ওয়ার্ড নং-17",
                "nameEn": "Ward No-17"
              },
              {
                "name": "ওয়ার্ড নং-18",
                "nameEn": "Ward No-18"
              },
              {
                "name": "ওয়ার্ড নং-19",
                "nameEn": "Ward No-19"
              },
              {
                "name": "ওয়ার্ড নং-20",
                "nameEn": "Ward No-20"
              },
              {
                "name": "ওয়ার্ড নং-21",
                "nameEn": "Ward No-21"
              },
              {
                "name": "ওয়ার্ড নং-22",
                "nameEn": "Ward No-22"
              },
              {
                "name": "ওয়ার্ড নং-23",
                "nameEn": "Ward No-23"
              },
              {
                "name": "ওয়ার্ড নং-24",
                "nameEn": "Ward No-24"
              },
              {
                "name": "ওয়ার্ড নং-25",
                "nameEn": "Ward No-25"
              },
              {
                "name": "ওয়ার্ড নং-26",
                "nameEn": "Ward No-26"
              },
              {
                "name": "ওয়ার্ড নং-27",
                "nameEn": "Ward No-27"
              },
              {
                "name": "ওয়ার্ড নং-28",
                "nameEn": "Ward No-28"
              },
              {
                "name": "ওয়ার্ড নং-29",
                "nameEn": "Ward No-29"
              },
              {
                "name": "ওয়ার্ড নং-30",
                "nameEn": "Ward No-30"
              },
              {
                "name": "ওয়ার্ড নং-31",
                "nameEn": "Ward No-31"
              },
              {
                "name": "ওয়ার্ড নং-32",
                "nameEn": "Ward No-32"
              },
              {
                "name": "ওয়ার্ড নং-33",
                "nameEn": "Ward No-33"
              },
              {
                "name": "ওয়ার্ড নং-34",
                "nameEn": "Ward No-34"
              },
              {
                "name": "ওয়ার্ড নং-35",
                "nameEn": "Ward No-35"
              },
              {
                "name": "ওয়ার্ড নং-36",
                "nameEn": "Ward No-36"
              },
              {
                "name": "ওয়ার্ড নং-37",
                "nameEn": "Ward No-37"
              },
              {
                "name": "ওয়ার্ড নং-38",
                "nameEn": "Ward No-38"
              },
              {
                "name": "ওয়ার্ড নং-39",
                "nameEn": "Ward No-39"
              },
              {
                "name": "ওয়ার্ড নং-40",
                "nameEn": "Ward No-40"
              },
              {
                "name": "ওয়ার্ড নং-41",
                "nameEn": "Ward No-41"
              },
              {
                "name": "ওয়ার্ড নং-42",
                "nameEn": "Ward No-42"
              },
              {
                "name": "ওয়ার্ড নং-43",
                "nameEn": "Ward No-43"
              },
              {
                "name": "ওয়ার্ড নং-44",
                "nameEn": "Ward No-44"
              },
              {
                "name": "ওয়ার্ড নং-45",
                "nameEn": "Ward No-45"
              },
              {
                "name": "ওয়ার্ড নং-46",
                "nameEn": "Ward No-46"
              },
              {
                "name": "ওয়ার্ড নং-47",
                "nameEn": "Ward No-47"
              },
              {
                "name": "ওয়ার্ড নং-48",
                "nameEn": "Ward No-48"
              },
              {
                "name": "ওয়ার্ড নং-49",
                "nameEn": "Ward No-49"
              },
              {
                "name": "ওয়ার্ড নং-50",
                "nameEn": "Ward No-50"
              },
              {
                "name": "ওয়ার্ড নং-51",
                "nameEn": "Ward No-51"
              },
              {
                "name": "ওয়ার্ড নং-52",
                "nameEn": "Ward No-52"
              },
              {
                "name": "ওয়ার্ড নং-53",
                "nameEn": "Ward No-53"
              },
              {
                "name": "ওয়ার্ড নং-54",
                "nameEn": "Ward No-54"
              }
            ],
            "type": "city_corporation"
          },
          {
            "name": "সাভার উপজেলা",
            "nameEn": "Dhamrai",
            "unions": [
              {
                "name": "ধামরাই",
                "nameEn": "ধামরাই"
              },
              {
                "name": "সুতিপাড়া",
                "nameEn": "সুতিপাড়া"
              },
              {
                "name": "গাংটিয়া",
                "nameEn": "গাংটিয়া"
              },
              {
                "name": "রোয়াইল",
                "nameEn": "রোয়াইল"
              },
              {
                "name": "সাংসার",
                "nameEn": "সাংসার"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ধামরাই উপজেলা",
            "nameEn": "Dohar",
            "unions": [
              {
                "name": "দোহার",
                "nameEn": "দোহার"
              },
              {
                "name": "নবাবগঞ্জ",
                "nameEn": "নবাবগঞ্জ"
              },
              {
                "name": "মাহমুদপুর",
                "nameEn": "মাহমুদপুর"
              },
              {
                "name": "সুয়াপুর",
                "nameEn": "সুয়াপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "দোহার উপজেলা",
            "nameEn": "Keraniganj",
            "unions": [
              {
                "name": "কেরানীগঞ্জ",
                "nameEn": "কেরানীগঞ্জ"
              },
              {
                "name": "কালিন্দী",
                "nameEn": "কালিন্দী"
              },
              {
                "name": "আড়াইবাড়ী",
                "nameEn": "আড়াইবাড়ী"
              },
              {
                "name": "শুভাঢ্যা",
                "nameEn": "শুভাঢ্যা"
              },
              {
                "name": "তেঘরিয়া",
                "nameEn": "তেঘরিয়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কেরানীগঞ্জ উপজেলা",
            "nameEn": "Nawabganj",
            "unions": [
              {
                "name": "নবাবগঞ্জ",
                "nameEn": "নবাবগঞ্জ"
              },
              {
                "name": "আগলা",
                "nameEn": "আগলা"
              },
              {
                "name": "কালাকোপা",
                "nameEn": "কালাকোপা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "নবাবগঞ্জ উপজেলা",
            "nameEn": "Savar",
            "unions": [
              {
                "name": "সাভার",
                "nameEn": "সাভার"
              },
              {
                "name": "আমিনবাজার",
                "nameEn": "আমিনবাজার"
              },
              {
                "name": "আশুলিয়া",
                "nameEn": "আশুলিয়া"
              },
              {
                "name": "বিরুলিয়া",
                "nameEn": "বিরুলিয়া"
              },
              {
                "name": "পাথালিয়া",
                "nameEn": "পাথালিয়া"
              },
              {
                "name": "তেঁতুলঝরা",
                "nameEn": "তেঁতুলঝরা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Savar পৌরসভা",
            "nameEn": "Savar Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Dhamrai পৌরসভা",
            "nameEn": "Dhamrai Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Keraniganj পৌরসভা",
            "nameEn": "Keraniganj Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Nawabganj পৌরসভা",
            "nameEn": "Nawabganj Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Dohar পৌরসভা",
            "nameEn": "Dohar Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "ফরিদপুর",
        "nameEn": "Faridpur",
        "upazilas": [
          {
            "name": "ফরিদপুর পৌরসভা",
            "nameEn": "Faridpur Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              },
              {
                "name": "ওয়ার্ড নং-10",
                "nameEn": "Ward No-10"
              },
              {
                "name": "ওয়ার্ড নং-11",
                "nameEn": "Ward No-11"
              },
              {
                "name": "ওয়ার্ড নং-12",
                "nameEn": "Ward No-12"
              },
              {
                "name": "ওয়ার্ড নং-13",
                "nameEn": "Ward No-13"
              },
              {
                "name": "ওয়ার্ড নং-14",
                "nameEn": "Ward No-14"
              },
              {
                "name": "ওয়ার্ড নং-15",
                "nameEn": "Ward No-15"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "ফরিদপুর সদর উপজেলা",
            "nameEn": "Alfadanga",
            "unions": [
              {
                "name": "আলফাডাঙ্গা",
                "nameEn": "আলফাডাঙ্গা"
              },
              {
                "name": "বুল্লতলা",
                "nameEn": "বুল্লতলা"
              },
              {
                "name": "গোবিন্দপুর",
                "nameEn": "গোবিন্দপুর"
              },
              {
                "name": "তাগরবন্দ",
                "nameEn": "তাগরবন্দ"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বোয়ালমারী উপজেলা",
            "nameEn": "Bhanga",
            "unions": [
              {
                "name": "ভাঙ্গা",
                "nameEn": "ভাঙ্গা"
              },
              {
                "name": "হামিরদী",
                "nameEn": "হামিরদী"
              },
              {
                "name": "মাছপাড়া",
                "nameEn": "মাছপাড়া"
              },
              {
                "name": "কদমবাড়ী",
                "nameEn": "কদমবাড়ী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "আলফাডাঙ্গা উপজেলা",
            "nameEn": "Boalmari",
            "unions": [
              {
                "name": "বোয়ালমারী",
                "nameEn": "বোয়ালমারী"
              },
              {
                "name": "চরমাধবদিয়া",
                "nameEn": "চরমাধবদিয়া"
              },
              {
                "name": "সাতৈর",
                "nameEn": "সাতৈর"
              },
              {
                "name": "রূপাপাত",
                "nameEn": "রূপাপাত"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মধুখালী উপজেলা",
            "nameEn": "Charbhadrasan",
            "unions": [
              {
                "name": "চরভদ্রাসন",
                "nameEn": "চরভদ্রাসন"
              },
              {
                "name": "চরনয়ানগর",
                "nameEn": "চরনয়ানগর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ভাঙ্গা উপজেলা",
            "nameEn": "Faridpur Sadar",
            "unions": [
              {
                "name": "ফরিদপুর সদর",
                "nameEn": "ফরিদপুর সদর"
              },
              {
                "name": "কানাইপুর",
                "nameEn": "কানাইপুর"
              },
              {
                "name": "ঢাকা-বারিশাল মহাসড়ক",
                "nameEn": "ঢাকা-বারিশাল মহাসড়ক"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "নগরকান্দা উপজেলা",
            "nameEn": "Madhukhali",
            "unions": [
              {
                "name": "মধুখালী",
                "nameEn": "মধুখালী"
              },
              {
                "name": "বালিয়াকান্দি",
                "nameEn": "বালিয়াকান্দি"
              },
              {
                "name": "কামারখালী",
                "nameEn": "কামারখালী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "চরভদ্রাসন উপজেলা",
            "nameEn": "Nagarkanda",
            "unions": [
              {
                "name": "নগরকান্দা",
                "nameEn": "নগরকান্দা"
              },
              {
                "name": "ভদ্রকালী",
                "nameEn": "ভদ্রকালী"
              },
              {
                "name": "ডাংমারী",
                "nameEn": "ডাংমারী"
              },
              {
                "name": "তালমা",
                "nameEn": "তালমা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "সদরপুর উপজেলা",
            "nameEn": "Sadarpur",
            "unions": [
              {
                "name": "সদরপুর",
                "nameEn": "সদরপুর"
              },
              {
                "name": "চরমুগুরিয়া",
                "nameEn": "চরমুগুরিয়া"
              },
              {
                "name": "ঘোষপুর",
                "nameEn": "ঘোষপুর"
              },
              {
                "name": "মাদবরেড়",
                "nameEn": "মাদবরেড়"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "সালথা উপজেলা",
            "nameEn": "Saltha",
            "unions": [
              {
                "name": "সালথা",
                "nameEn": "সালথা"
              },
              {
                "name": "আমড়া",
                "nameEn": "আমড়া"
              },
              {
                "name": "বিলামচি",
                "nameEn": "বিলামচি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Bhanga পৌরসভা",
            "nameEn": "Bhanga Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Boalmari পৌরসভা",
            "nameEn": "Boalmari Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Madhukhali পৌরসভা",
            "nameEn": "Madhukhali Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Nagarkanda পৌরসভা",
            "nameEn": "Nagarkanda Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Sadarpur পৌরসভা",
            "nameEn": "Sadarpur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "গাজীপুর",
        "nameEn": "Gazipur",
        "upazilas": [
          {
            "name": "গাজীপুর সিটি কর্পোরেশন",
            "nameEn": "Gazipur City Corporation",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              },
              {
                "name": "ওয়ার্ড নং-10",
                "nameEn": "Ward No-10"
              },
              {
                "name": "ওয়ার্ড নং-11",
                "nameEn": "Ward No-11"
              },
              {
                "name": "ওয়ার্ড নং-12",
                "nameEn": "Ward No-12"
              },
              {
                "name": "ওয়ার্ড নং-13",
                "nameEn": "Ward No-13"
              },
              {
                "name": "ওয়ার্ড নং-14",
                "nameEn": "Ward No-14"
              },
              {
                "name": "ওয়ার্ড নং-15",
                "nameEn": "Ward No-15"
              },
              {
                "name": "ওয়ার্ড নং-16",
                "nameEn": "Ward No-16"
              },
              {
                "name": "ওয়ার্ড নং-17",
                "nameEn": "Ward No-17"
              },
              {
                "name": "ওয়ার্ড নং-18",
                "nameEn": "Ward No-18"
              },
              {
                "name": "ওয়ার্ড নং-19",
                "nameEn": "Ward No-19"
              },
              {
                "name": "ওয়ার্ড নং-20",
                "nameEn": "Ward No-20"
              },
              {
                "name": "ওয়ার্ড নং-21",
                "nameEn": "Ward No-21"
              },
              {
                "name": "ওয়ার্ড নং-22",
                "nameEn": "Ward No-22"
              },
              {
                "name": "ওয়ার্ড নং-23",
                "nameEn": "Ward No-23"
              },
              {
                "name": "ওয়ার্ড নং-24",
                "nameEn": "Ward No-24"
              },
              {
                "name": "ওয়ার্ড নং-25",
                "nameEn": "Ward No-25"
              },
              {
                "name": "ওয়ার্ড নং-26",
                "nameEn": "Ward No-26"
              },
              {
                "name": "ওয়ার্ড নং-27",
                "nameEn": "Ward No-27"
              },
              {
                "name": "ওয়ার্ড নং-28",
                "nameEn": "Ward No-28"
              },
              {
                "name": "ওয়ার্ড নং-29",
                "nameEn": "Ward No-29"
              },
              {
                "name": "ওয়ার্ড নং-30",
                "nameEn": "Ward No-30"
              },
              {
                "name": "ওয়ার্ড নং-31",
                "nameEn": "Ward No-31"
              },
              {
                "name": "ওয়ার্ড নং-32",
                "nameEn": "Ward No-32"
              },
              {
                "name": "ওয়ার্ড নং-33",
                "nameEn": "Ward No-33"
              },
              {
                "name": "ওয়ার্ড নং-34",
                "nameEn": "Ward No-34"
              },
              {
                "name": "ওয়ার্ড নং-35",
                "nameEn": "Ward No-35"
              },
              {
                "name": "ওয়ার্ড নং-36",
                "nameEn": "Ward No-36"
              },
              {
                "name": "ওয়ার্ড নং-37",
                "nameEn": "Ward No-37"
              },
              {
                "name": "ওয়ার্ড নং-38",
                "nameEn": "Ward No-38"
              },
              {
                "name": "ওয়ার্ড নং-39",
                "nameEn": "Ward No-39"
              },
              {
                "name": "ওয়ার্ড নং-40",
                "nameEn": "Ward No-40"
              },
              {
                "name": "ওয়ার্ড নং-41",
                "nameEn": "Ward No-41"
              },
              {
                "name": "ওয়ার্ড নং-42",
                "nameEn": "Ward No-42"
              },
              {
                "name": "ওয়ার্ড নং-43",
                "nameEn": "Ward No-43"
              },
              {
                "name": "ওয়ার্ড নং-44",
                "nameEn": "Ward No-44"
              },
              {
                "name": "ওয়ার্ড নং-45",
                "nameEn": "Ward No-45"
              },
              {
                "name": "ওয়ার্ড নং-46",
                "nameEn": "Ward No-46"
              },
              {
                "name": "ওয়ার্ড নং-47",
                "nameEn": "Ward No-47"
              },
              {
                "name": "ওয়ার্ড নং-48",
                "nameEn": "Ward No-48"
              },
              {
                "name": "ওয়ার্ড নং-49",
                "nameEn": "Ward No-49"
              },
              {
                "name": "ওয়ার্ড নং-50",
                "nameEn": "Ward No-50"
              },
              {
                "name": "ওয়ার্ড নং-51",
                "nameEn": "Ward No-51"
              },
              {
                "name": "ওয়ার্ড নং-52",
                "nameEn": "Ward No-52"
              },
              {
                "name": "ওয়ার্ড নং-53",
                "nameEn": "Ward No-53"
              },
              {
                "name": "ওয়ার্ড নং-54",
                "nameEn": "Ward No-54"
              },
              {
                "name": "ওয়ার্ড নং-55",
                "nameEn": "Ward No-55"
              },
              {
                "name": "ওয়ার্ড নং-56",
                "nameEn": "Ward No-56"
              },
              {
                "name": "ওয়ার্ড নং-57",
                "nameEn": "Ward No-57"
              }
            ],
            "type": "city_corporation"
          },
          {
            "name": "গাজীপুর সদর উপজেলা",
            "nameEn": "Gazipur Sadar",
            "unions": [
              {
                "name": "গাজীপুর সদর",
                "nameEn": "গাজীপুর সদর"
              },
              {
                "name": "বাসন",
                "nameEn": "বাসন"
              },
              {
                "name": "মাস্তারবাড়ী",
                "nameEn": "মাস্তারবাড়ী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কালিয়াকৈর উপজেলা",
            "nameEn": "Kaliakoir",
            "unions": [
              {
                "name": "কালিয়াকৈর",
                "nameEn": "কালিয়াকৈর"
              },
              {
                "name": "ফুলবাড়ীয়া",
                "nameEn": "ফুলবাড়ীয়া"
              },
              {
                "name": "চন্দ্রা",
                "nameEn": "চন্দ্রা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কালীগঞ্জ উপজেলা",
            "nameEn": "Kaliganj",
            "unions": [
              {
                "name": "Kaliganj সদর",
                "nameEn": "Kaliganj Sadar"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কাপাসিয়া উপজেলা",
            "nameEn": "Kapasia",
            "unions": [
              {
                "name": "কাপাসিয়া",
                "nameEn": "কাপাসিয়া"
              },
              {
                "name": "সিংহশ্রী",
                "nameEn": "সিংহশ্রী"
              },
              {
                "name": "ঘাগটিয়া",
                "nameEn": "ঘাগটিয়া"
              },
              {
                "name": "চান্দপুর",
                "nameEn": "চান্দপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "শ্রীপুর উপজেলা",
            "nameEn": "Sreepur",
            "unions": [
              {
                "name": "Sreepur সদর",
                "nameEn": "Sreepur Sadar"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Kaliakair পৌরসভা",
            "nameEn": "Kaliakair Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Kaliganj পৌরসভা",
            "nameEn": "Kaliganj Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Kapasia পৌরসভা",
            "nameEn": "Kapasia Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Sreepur পৌরসভা",
            "nameEn": "Sreepur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Tongi পৌরসভা",
            "nameEn": "Tongi Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "গোপালগঞ্জ",
        "nameEn": "Gopalganj",
        "upazilas": [
          {
            "name": "গোপালগঞ্জ পৌরসভা",
            "nameEn": "Gopalganj Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "গোপালগঞ্জ সদর উপজেলা",
            "nameEn": "Gopalganj Sadar",
            "unions": [
              {
                "name": "গোপালগঞ্জ সদর",
                "nameEn": "গোপালগঞ্জ সদর"
              },
              {
                "name": "রাঘদী",
                "nameEn": "রাঘদী"
              },
              {
                "name": "গোপালপুর",
                "nameEn": "গোপালপুর"
              },
              {
                "name": "উলপুর",
                "nameEn": "উলপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মুকসুদপুর উপজেলা",
            "nameEn": "Kasiani",
            "unions": [
              {
                "name": "কাশিয়ানী",
                "nameEn": "কাশিয়ানী"
              },
              {
                "name": "ফুকরা",
                "nameEn": "ফুকরা"
              },
              {
                "name": "সাজাইল",
                "nameEn": "সাজাইল"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কাশিয়ানী উপজেলা",
            "nameEn": "Kotwalipara",
            "unions": [
              {
                "name": "কোটালীপাড়া",
                "nameEn": "কোটালীপাড়া"
              },
              {
                "name": "কুশলা",
                "nameEn": "কুশলা"
              },
              {
                "name": "রাধাগঞ্জ",
                "nameEn": "রাধাগঞ্জ"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কোটালীপাড়া উপজেলা",
            "nameEn": "Muksudpur",
            "unions": [
              {
                "name": "মুকসুদপুর",
                "nameEn": "মুকসুদপুর"
              },
              {
                "name": "বাটিকামারী",
                "nameEn": "বাটিকামারী"
              },
              {
                "name": "পাটগাতি",
                "nameEn": "পাটগাতি"
              },
              {
                "name": "কান্দি",
                "nameEn": "কান্দি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "টুঙ্গিপাড়া উপজেলা",
            "nameEn": "Tungipara",
            "unions": [
              {
                "name": "টুঙ্গিপাড়া",
                "nameEn": "টুঙ্গিপাড়া"
              },
              {
                "name": "পাটগাতি",
                "nameEn": "পাটগাতি"
              },
              {
                "name": "গোপালপুর",
                "nameEn": "গোপালপুর"
              },
              {
                "name": "বর্ণি",
                "nameEn": "বর্ণি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Kashiani পৌরসভা",
            "nameEn": "Kashiani Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Kotalipara পৌরসভা",
            "nameEn": "Kotalipara Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Tungipara পৌরসভা",
            "nameEn": "Tungipara Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Muksudpur পৌরসভা",
            "nameEn": "Muksudpur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "কিশোরগঞ্জ",
        "nameEn": "Kishoreganj",
        "upazilas": [
          {
            "name": "কিশোরগঞ্জ পৌরসভা",
            "nameEn": "Kishoreganj Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "কিশোরগঞ্জ সদর উপজেলা",
            "nameEn": "Austagram",
            "unions": [
              {
                "name": "অষ্টগ্রাম",
                "nameEn": "অষ্টগ্রাম"
              },
              {
                "name": "বাংগালপাড়া",
                "nameEn": "বাংগালপাড়া"
              },
              {
                "name": "কালিকাপ্রসাদ",
                "nameEn": "কালিকাপ্রসাদ"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "অষ্টগ্রাম উপজেলা",
            "nameEn": "Bajitpur",
            "unions": [
              {
                "name": "বাজিতপুর",
                "nameEn": "বাজিতপুর"
              },
              {
                "name": "সরষপুর",
                "nameEn": "সরষপুর"
              },
              {
                "name": "দিলালপুর",
                "nameEn": "দিলালপুর"
              },
              {
                "name": "পোগলদিঘী",
                "nameEn": "পোগলদিঘী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ইটনা উপজেলা",
            "nameEn": "Bhairab",
            "unions": [
              {
                "name": "ভৈরব",
                "nameEn": "ভৈরব"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "করিমগঞ্জ উপজেলা",
            "nameEn": "Hossainpur",
            "unions": [
              {
                "name": "হোসেনপুর",
                "nameEn": "হোসেনপুর"
              },
              {
                "name": "আড়াইসিধা",
                "nameEn": "আড়াইসিধা"
              },
              {
                "name": "রতনপুর",
                "nameEn": "রতনপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কটিয়াদি উপজেলা",
            "nameEn": "Itna",
            "unions": [
              {
                "name": "ইটনা",
                "nameEn": "ইটনা"
              },
              {
                "name": "ধনপুর",
                "nameEn": "ধনপুর"
              },
              {
                "name": "রায়পুর",
                "nameEn": "রায়পুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কুলিয়ারচর উপজেলা",
            "nameEn": "Karimganj",
            "unions": [
              {
                "name": "করিমগঞ্জ",
                "nameEn": "করিমগঞ্জ"
              },
              {
                "name": "কান্দুয়া",
                "nameEn": "কান্দুয়া"
              },
              {
                "name": "জাওয়ার",
                "nameEn": "জাওয়ার"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "তাড়াইল উপজেলা",
            "nameEn": "Katiadi",
            "unions": [
              {
                "name": "কটিয়াদী",
                "nameEn": "কটিয়াদী"
              },
              {
                "name": "মশুয়া",
                "nameEn": "মশুয়া"
              },
              {
                "name": "ইছাপুরা",
                "nameEn": "ইছাপুরা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "নিকলী উপজেলা",
            "nameEn": "Kishoreganj Sadar",
            "unions": [
              {
                "name": "কিশোরগঞ্জ সদর",
                "nameEn": "কিশোরগঞ্জ সদর"
              },
              {
                "name": "মাইজখাপন",
                "nameEn": "মাইজখাপন"
              },
              {
                "name": "চামড়াগাতি",
                "nameEn": "চামড়াগাতি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "পাকুন্দিয়া উপজেলা",
            "nameEn": "Kuliarchar",
            "unions": [
              {
                "name": "কুলিয়ারচর",
                "nameEn": "কুলিয়ারচর"
              },
              {
                "name": "হিলচিয়া",
                "nameEn": "হিলচিয়া"
              },
              {
                "name": "ভৈরবপুর",
                "nameEn": "ভৈরবপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বাজিতপুর উপজেলা",
            "nameEn": "Mithamoin",
            "unions": [
              {
                "name": "মিঠামইন",
                "nameEn": "মিঠামইন"
              },
              {
                "name": "ঘোড়াউতরা",
                "nameEn": "ঘোড়াউতরা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ভৈরব উপজেলা",
            "nameEn": "Nikli",
            "unions": [
              {
                "name": "নিকলী",
                "nameEn": "নিকলী"
              },
              {
                "name": "গুরুই",
                "nameEn": "গুরুই"
              },
              {
                "name": "জাওয়ার",
                "nameEn": "জাওয়ার"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মিঠামইন উপজেলা",
            "nameEn": "Pakundia",
            "unions": [
              {
                "name": "পাকুন্দিয়া",
                "nameEn": "পাকুন্দিয়া"
              },
              {
                "name": "ছাতিরচর",
                "nameEn": "ছাতিরচর"
              },
              {
                "name": "এগারসিন্ধুর",
                "nameEn": "এগারসিন্ধুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "হোসেনপুর উপজেলা",
            "nameEn": "Tarail",
            "unions": [
              {
                "name": "তাড়াইল",
                "nameEn": "তাড়াইল"
              },
              {
                "name": "ধলা",
                "nameEn": "ধলা"
              },
              {
                "name": "গোপদিঘী",
                "nameEn": "গোপদিঘী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Bhairab পৌরসভা",
            "nameEn": "Bhairab Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Bajitpur পৌরসভা",
            "nameEn": "Bajitpur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Kuliarchar পৌরসভা",
            "nameEn": "Kuliarchar Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Pakundia পৌরসভা",
            "nameEn": "Pakundia Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Hossainpur পৌরসভা",
            "nameEn": "Hossainpur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Katiadi পৌরসভা",
            "nameEn": "Katiadi Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "মাদারীপুর",
        "nameEn": "Madaripur",
        "upazilas": [
          {
            "name": "মাদারীপুর পৌরসভা",
            "nameEn": "Madaripur Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "মাদারীপুর সদর উপজেলা",
            "nameEn": "Kalkini",
            "unions": [
              {
                "name": "কালকিনি",
                "nameEn": "কালকিনি"
              },
              {
                "name": "লক্ষ্মীপুর",
                "nameEn": "লক্ষ্মীপুর"
              },
              {
                "name": "কাদিরবন্দর",
                "nameEn": "কাদিরবন্দর"
              },
              {
                "name": "সাহেবরামপুর",
                "nameEn": "সাহেবরামপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "শিবচর উপজেলা",
            "nameEn": "Madaripur Sadar",
            "unions": [
              {
                "name": "মাদারীপুর সদর",
                "nameEn": "মাদারীপুর সদর"
              },
              {
                "name": "পাঁচগাঁও",
                "nameEn": "পাঁচগাঁও"
              },
              {
                "name": "বারহামন্ডল",
                "nameEn": "বারহামন্ডল"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কালকিনী উপজেলা",
            "nameEn": "Rajoir",
            "unions": [
              {
                "name": "রাজৈর",
                "nameEn": "রাজৈর"
              },
              {
                "name": "খালিয়া",
                "nameEn": "খালিয়া"
              },
              {
                "name": "মদাপুর",
                "nameEn": "মদাপুর"
              },
              {
                "name": "রাজৈর",
                "nameEn": "রাজৈর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "রাজৈর উপজেলা",
            "nameEn": "Shibchar",
            "unions": [
              {
                "name": "শিবচর",
                "nameEn": "শিবচর"
              },
              {
                "name": "পানচর",
                "nameEn": "পানচর"
              },
              {
                "name": "পাটুরিয়া",
                "nameEn": "পাটুরিয়া"
              },
              {
                "name": "বান্দেরকোলা",
                "nameEn": "বান্দেরকোলা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Rajoir পৌরসভা",
            "nameEn": "Rajoir Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Shibchar পৌরসভা",
            "nameEn": "Shibchar Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Kalkini পৌরসভা",
            "nameEn": "Kalkini Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "মানিকগঞ্জ",
        "nameEn": "Manikganj",
        "upazilas": [
          {
            "name": "মানিকগঞ্জ পৌরসভা",
            "nameEn": "Manikganj Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "মাদারীপুর সদর উপজেলা",
            "nameEn": "Daulatpur",
            "unions": [
              {
                "name": "দৌলতপুর",
                "nameEn": "দৌলতপুর"
              },
              {
                "name": "আলুতলা",
                "nameEn": "আলুতলা"
              },
              {
                "name": "খানপুর",
                "nameEn": "খানপুর"
              },
              {
                "name": "সেনহাটি",
                "nameEn": "সেনহাটি"
              },
              {
                "name": "ফুলতলা",
                "nameEn": "ফুলতলা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মানিকগঞ্জ সদর উপজেলা",
            "nameEn": "Ghior",
            "unions": [
              {
                "name": "ঘিওর",
                "nameEn": "ঘিওর"
              },
              {
                "name": "পাইলপুর",
                "nameEn": "পাইলপুর"
              },
              {
                "name": "বালিয়াটি",
                "nameEn": "বালিয়াটি"
              },
              {
                "name": "কামরাইল",
                "nameEn": "কামরাইল"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ঘিওর উপজেলা",
            "nameEn": "Harirampur",
            "unions": [
              {
                "name": "হরিরামপুর",
                "nameEn": "হরিরামপুর"
              },
              {
                "name": "সুলতানপুর",
                "nameEn": "সুলতানপুর"
              },
              {
                "name": "ধনেশ্বরদি",
                "nameEn": "ধনেশ্বরদি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "দৌলতপুর উপজেলা",
            "nameEn": "Manikganj Sadar",
            "unions": [
              {
                "name": "মানিকগঞ্জ সদর",
                "nameEn": "মানিকগঞ্জ সদর"
              },
              {
                "name": "বেতিলা মিতরা",
                "nameEn": "বেতিলা মিতরা"
              },
              {
                "name": "খানবাড়ী",
                "nameEn": "খানবাড়ী"
              },
              {
                "name": "হাটিপাড়া",
                "nameEn": "হাটিপাড়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "শিবালয় উপজেলা",
            "nameEn": "Saturia",
            "unions": [
              {
                "name": "সাটুরিয়া",
                "nameEn": "সাটুরিয়া"
              },
              {
                "name": "ধানকোড়া",
                "nameEn": "ধানকোড়া"
              },
              {
                "name": "নিমতা",
                "nameEn": "নিমতা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "সাটুরিয়া উপজেলা",
            "nameEn": "Shivalaya",
            "unions": [
              {
                "name": "শিবালয়",
                "nameEn": "শিবালয়"
              },
              {
                "name": "আরুয়া",
                "nameEn": "আরুয়া"
              },
              {
                "name": "উলাইল",
                "nameEn": "উলাইল"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "সিঙ্গাইর উপজেলা",
            "nameEn": "Singair",
            "unions": [
              {
                "name": "সিঙ্গাইর",
                "nameEn": "সিঙ্গাইর"
              },
              {
                "name": "চারাভাঙ্গা",
                "nameEn": "চারাভাঙ্গা"
              },
              {
                "name": "বালিয়াখোড়া",
                "nameEn": "বালিয়াখোড়া"
              },
              {
                "name": "জামশা",
                "nameEn": "জামশা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "হরিরামপুর উপজেলা",
            "nameEn": "হরিরামপুর",
            "unions": [
              {
                "name": "হরিরামপুর",
                "nameEn": "হরিরামপুর"
              },
              {
                "name": "সুলতানপুর",
                "nameEn": "সুলতানপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Singair পৌরসভা",
            "nameEn": "Singair Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Shibalaya পৌরসভা",
            "nameEn": "Shibalaya Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Saturia পৌরসভা",
            "nameEn": "Saturia Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Harirampur পৌরসভা",
            "nameEn": "Harirampur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Ghior পৌরসভা",
            "nameEn": "Ghior Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Daulatpur পৌরসভা",
            "nameEn": "Daulatpur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "মুন্সিগঞ্জ",
        "nameEn": "Munshiganj",
        "upazilas": [
          {
            "name": "মুন্সীগঞ্জ পৌরসভা",
            "nameEn": "Munshiganj Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "মুন্সিগঞ্জ সদর উপজেলা",
            "nameEn": "Gazaria",
            "unions": [
              {
                "name": "গজারিয়া",
                "nameEn": "গজারিয়া"
              },
              {
                "name": "কোন্ডা",
                "nameEn": "কোন্ডা"
              },
              {
                "name": "ভাবেরচর",
                "nameEn": "ভাবেরচর"
              },
              {
                "name": "ইমামপুর",
                "nameEn": "ইমামপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "শ্রীনগর সদর উপজেলা",
            "nameEn": "Lauhajong",
            "unions": [
              {
                "name": "লৌহজং",
                "nameEn": "লৌহজং"
              },
              {
                "name": "কুমারভোগ",
                "nameEn": "কুমারভোগ"
              },
              {
                "name": "মেদিনীমণ্ডল",
                "nameEn": "মেদিনীমণ্ডল"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "সিরাজদীখান উপজেলা",
            "nameEn": "Munshiganj Sadar",
            "unions": [
              {
                "name": "মুন্সীগঞ্জ সদর",
                "nameEn": "মুন্সীগঞ্জ সদর"
              },
              {
                "name": "মাহাকালী",
                "nameEn": "মাহাকালী"
              },
              {
                "name": "পঞ্চসার",
                "nameEn": "পঞ্চসার"
              },
              {
                "name": "রামপাল",
                "nameEn": "রামপাল"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "লৌহজং উপজেলা",
            "nameEn": "Sirajdikhan",
            "unions": [
              {
                "name": "সিরাজদিখান",
                "nameEn": "সিরাজদিখান"
              },
              {
                "name": "ইছাপুরা",
                "nameEn": "ইছাপুরা"
              },
              {
                "name": "রশিদপুর",
                "nameEn": "রশিদপুর"
              },
              {
                "name": "কলমা",
                "nameEn": "কলমা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "টঙ্গীবাড়ী উপজেলা",
            "nameEn": "Sreenagar",
            "unions": [
              {
                "name": "শ্রীনগর",
                "nameEn": "শ্রীনগর"
              },
              {
                "name": "শ্যামসিদ্ধি",
                "nameEn": "শ্যামসিদ্ধি"
              },
              {
                "name": "আটপাড়া",
                "nameEn": "আটপাড়া"
              },
              {
                "name": "ভাগ্যকুল",
                "nameEn": "ভাগ্যকুল"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "গজারিয়া উপজেলা",
            "nameEn": "Tongibari",
            "unions": [
              {
                "name": "টঙ্গীবাড়ী",
                "nameEn": "টঙ্গীবাড়ী"
              },
              {
                "name": "ধীপুরা",
                "nameEn": "ধীপুরা"
              },
              {
                "name": "বজ্রযোগিনী",
                "nameEn": "বজ্রযোগিনী"
              },
              {
                "name": "আব্দুল্লাপুর",
                "nameEn": "আব্দুল্লাপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Tongibari পৌরসভা",
            "nameEn": "Tongibari Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Sreenagar পৌরসভা",
            "nameEn": "Sreenagar Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Sirajdikhan পৌরসভা",
            "nameEn": "Sirajdikhan Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Gazaria পৌরসভা",
            "nameEn": "Gazaria Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Lohajang পৌরসভা",
            "nameEn": "Lohajang Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "নারায়ণগঞ্জ",
        "nameEn": "Narayanganj",
        "upazilas": [
          {
            "name": "নারায়ণগঞ্জ সিটি কর্পোরেশন",
            "nameEn": "Narayanganj City Corporation",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              },
              {
                "name": "ওয়ার্ড নং-10",
                "nameEn": "Ward No-10"
              },
              {
                "name": "ওয়ার্ড নং-11",
                "nameEn": "Ward No-11"
              },
              {
                "name": "ওয়ার্ড নং-12",
                "nameEn": "Ward No-12"
              },
              {
                "name": "ওয়ার্ড নং-13",
                "nameEn": "Ward No-13"
              },
              {
                "name": "ওয়ার্ড নং-14",
                "nameEn": "Ward No-14"
              },
              {
                "name": "ওয়ার্ড নং-15",
                "nameEn": "Ward No-15"
              },
              {
                "name": "ওয়ার্ড নং-16",
                "nameEn": "Ward No-16"
              },
              {
                "name": "ওয়ার্ড নং-17",
                "nameEn": "Ward No-17"
              },
              {
                "name": "ওয়ার্ড নং-18",
                "nameEn": "Ward No-18"
              },
              {
                "name": "ওয়ার্ড নং-19",
                "nameEn": "Ward No-19"
              },
              {
                "name": "ওয়ার্ড নং-20",
                "nameEn": "Ward No-20"
              },
              {
                "name": "ওয়ার্ড নং-21",
                "nameEn": "Ward No-21"
              },
              {
                "name": "ওয়ার্ড নং-22",
                "nameEn": "Ward No-22"
              },
              {
                "name": "ওয়ার্ড নং-23",
                "nameEn": "Ward No-23"
              },
              {
                "name": "ওয়ার্ড নং-24",
                "nameEn": "Ward No-24"
              },
              {
                "name": "ওয়ার্ড নং-25",
                "nameEn": "Ward No-25"
              },
              {
                "name": "ওয়ার্ড নং-26",
                "nameEn": "Ward No-26"
              },
              {
                "name": "ওয়ার্ড নং-27",
                "nameEn": "Ward No-27"
              }
            ],
            "type": "city_corporation"
          },
          {
            "name": "আড়াইহাজার পৌরসভা",
            "nameEn": "Araihazar Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "বন্দর পৌরসভা",
            "nameEn": "Bandar Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "সোনারগাঁও পৌরসভা",
            "nameEn": "Sonargaon Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "নারায়ণগঞ্জ সদর উপজেলা",
            "nameEn": "Araihazar",
            "unions": [
              {
                "name": "আড়াইহাজার",
                "nameEn": "আড়াইহাজার"
              },
              {
                "name": "সিদ্ধিরগঞ্জ",
                "nameEn": "সিদ্ধিরগঞ্জ"
              },
              {
                "name": "গোপালদী",
                "nameEn": "গোপালদী"
              },
              {
                "name": "ফতুল্লা",
                "nameEn": "ফতুল্লা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বন্দর উপজেলা",
            "nameEn": "Bandar",
            "unions": [
              {
                "name": "বন্দর",
                "nameEn": "বন্দর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "আড়াইহাজার উপজেলা",
            "nameEn": "Narayanganj Sadar",
            "unions": [
              {
                "name": "নারায়ণগঞ্জ সদর",
                "nameEn": "নারায়ণগঞ্জ সদর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "রূপগঞ্জ উপজেলা",
            "nameEn": "Rupganj",
            "unions": [
              {
                "name": "রূপগঞ্জ",
                "nameEn": "রূপগঞ্জ"
              },
              {
                "name": "মুড়াপাড়া",
                "nameEn": "মুড়াপাড়া"
              },
              {
                "name": "ভূলতা",
                "nameEn": "ভূলতা"
              },
              {
                "name": "কাঞ্চন",
                "nameEn": "কাঞ্চন"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "সোনারগাঁও উপজেলা",
            "nameEn": "Sonargaon",
            "unions": [
              {
                "name": "সোনারগাঁও",
                "nameEn": "সোনারগাঁও"
              },
              {
                "name": "পাড়া",
                "nameEn": "পাড়া"
              },
              {
                "name": "পিরোজপুর",
                "nameEn": "পিরোজপুর"
              },
              {
                "name": "মোগরাপাড়া",
                "nameEn": "মোগরাপাড়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Araihazar পৌরসভা",
            "nameEn": "Araihazar Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Bandar পৌরসভা",
            "nameEn": "Bandar Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Sonargaon পৌরসভা",
            "nameEn": "Sonargaon Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Rupganj পৌরসভা",
            "nameEn": "Rupganj Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "নরসিংদী",
        "nameEn": "Narshingdi",
        "upazilas": [
          {
            "name": "নরসিংদী পৌরসভা",
            "nameEn": "Narsingdi Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "নরসিংদী সদর উপজেলা",
            "nameEn": "Belabo",
            "unions": [
              {
                "name": "বেলাবো",
                "nameEn": "বেলাবো"
              },
              {
                "name": "বৈরাগীবাজার",
                "nameEn": "বৈরাগীবাজার"
              },
              {
                "name": "নরসিংদী",
                "nameEn": "নরসিংদী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বেলাবো উপজেলা",
            "nameEn": "Monohardi",
            "unions": [
              {
                "name": "মনোহরদী",
                "nameEn": "মনোহরদী"
              },
              {
                "name": "চরশিন্দুর",
                "nameEn": "চরশিন্দুর"
              },
              {
                "name": "মালিজোড়া",
                "nameEn": "মালিজোড়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "শিবপুর উপজেলা",
            "nameEn": "Narshingdi Sadar",
            "unions": [
              {
                "name": "নরসিংদী সদর",
                "nameEn": "নরসিংদী সদর"
              },
              {
                "name": "করিমপুর",
                "nameEn": "করিমপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মনোহরদী উপজেলা",
            "nameEn": "Palash",
            "unions": [
              {
                "name": "পলাশ",
                "nameEn": "পলাশ"
              },
              {
                "name": "চরসিন্ধুর",
                "nameEn": "চরসিন্ধুর"
              },
              {
                "name": "গজারিয়া",
                "nameEn": "গজারিয়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "রায়পুরা উপজেলা",
            "nameEn": "Raipura",
            "unions": [
              {
                "name": "রায়পুরা",
                "nameEn": "রায়পুরা"
              },
              {
                "name": "মর্জাল",
                "nameEn": "মর্জাল"
              },
              {
                "name": "মুসাপুর",
                "nameEn": "মুসাপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "পলাশ উপজেলা",
            "nameEn": "Shibpur",
            "unions": [
              {
                "name": "শিবপুর",
                "nameEn": "শিবপুর"
              },
              {
                "name": "পুটিয়া",
                "nameEn": "পুটিয়া"
              },
              {
                "name": "সাদেকপুর",
                "nameEn": "সাদেকপুর"
              }
            ],
            "type": "upazila"
          }
        ]
      },
      {
        "name": "রাজবাড়ী",
        "nameEn": "Rajbari",
        "upazilas": [
          {
            "name": "রাজবাড়ী পৌরসভা",
            "nameEn": "Rajbari Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "রাজবাড়ি সদর উপজেলা",
            "nameEn": "Baliakandi",
            "unions": [
              {
                "name": "বালিয়াকান্দি",
                "nameEn": "বালিয়াকান্দি"
              },
              {
                "name": "ইসলামপুর",
                "nameEn": "ইসলামপুর"
              },
              {
                "name": "নলিয়া",
                "nameEn": "নলিয়া"
              },
              {
                "name": "জামালপুর",
                "nameEn": "জামালপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "গোয়ালন্দ উপজেলা",
            "nameEn": "Goalanda",
            "unions": [
              {
                "name": "গোয়ালন্দঘাট",
                "nameEn": "গোয়ালন্দঘাট"
              },
              {
                "name": "ডৌলতদিয়া",
                "nameEn": "ডৌলতদিয়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "পাংশা উপজেলা",
            "nameEn": "Kalukhali",
            "unions": [
              {
                "name": "কালুখালী",
                "nameEn": "কালুখালী"
              },
              {
                "name": "বহরপুর",
                "nameEn": "বহরপুর"
              },
              {
                "name": "মাজবাড়ী",
                "nameEn": "মাজবাড়ী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বালিয়াকান্দি উপজেলা",
            "nameEn": "Pangsha",
            "unions": [
              {
                "name": "পাংশা",
                "nameEn": "পাংশা"
              },
              {
                "name": "হাবাশপুর",
                "nameEn": "হাবাশপুর"
              },
              {
                "name": "বরাট",
                "nameEn": "বরাট"
              },
              {
                "name": "কৃষ্ণপুর",
                "nameEn": "কৃষ্ণপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কালুখালী উপজেলা",
            "nameEn": "Rajbari Sadar",
            "unions": [
              {
                "name": "রাজবাড়ী সদর",
                "nameEn": "রাজবাড়ী সদর"
              },
              {
                "name": "সিদ্ধিরগঞ্জ",
                "nameEn": "সিদ্ধিরগঞ্জ"
              },
              {
                "name": "বসন্তপুর",
                "nameEn": "বসন্তপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Goalanda পৌরসভা",
            "nameEn": "Goalanda Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Pangsha পৌরসভা",
            "nameEn": "Pangsha Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Baliakandi পৌরসভা",
            "nameEn": "Baliakandi Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Kalukhali পৌরসভা",
            "nameEn": "Kalukhali Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "শরীয়তপুর",
        "nameEn": "Shariatpur",
        "upazilas": [
          {
            "name": "শরীয়তপুর পৌরসভা",
            "nameEn": "Shariatpur Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "শরিয়তপুর সদর উপজেলা",
            "nameEn": "Bhedarganj",
            "unions": [
              {
                "name": "ভেদরগঞ্জ",
                "nameEn": "ভেদরগঞ্জ"
              },
              {
                "name": "আরশীনগর",
                "nameEn": "আরশীনগর"
              },
              {
                "name": "কাচিপুর",
                "nameEn": "কাচিপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ডামুড্যা উপজেলা",
            "nameEn": "Damuddya",
            "unions": [
              {
                "name": "ডামুড্যা",
                "nameEn": "ডামুড্যা"
              },
              {
                "name": "সিরাজপুর",
                "nameEn": "সিরাজপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "নড়িয়া উপজেলা",
            "nameEn": "Goshairhat",
            "unions": [
              {
                "name": "গোসাইরহাট",
                "nameEn": "গোসাইরহাট"
              },
              {
                "name": "ইদিলপুর",
                "nameEn": "ইদিলপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ভেদরগঞ্জ উপজেলা",
            "nameEn": "Janjira",
            "unions": [
              {
                "name": "জাজিরা",
                "nameEn": "জাজিরা"
              },
              {
                "name": "বরিশাল",
                "nameEn": "বরিশাল"
              },
              {
                "name": "কুন্ডেরচর",
                "nameEn": "কুন্ডেরচর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "জাজিরা উপজেলা",
            "nameEn": "Naria",
            "unions": [
              {
                "name": "নড়িয়া",
                "nameEn": "নড়িয়া"
              },
              {
                "name": "ফতেজংগপুর",
                "nameEn": "ফতেজংগপুর"
              },
              {
                "name": "সখীপুর",
                "nameEn": "সখীপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "গোসাইরহাট উপজেলা",
            "nameEn": "Shariatpur Sadar",
            "unions": [
              {
                "name": "শরীয়তপুর সদর",
                "nameEn": "শরীয়তপুর সদর"
              },
              {
                "name": "চিকন্দী",
                "nameEn": "চিকন্দী"
              },
              {
                "name": "মহিষারা",
                "nameEn": "মহিষারা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Gosairhat পৌরসভা",
            "nameEn": "Gosairhat Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Naria পৌরসভা",
            "nameEn": "Naria Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Zanjira পৌরসভা",
            "nameEn": "Zanjira Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Bhedarganj পৌরসভা",
            "nameEn": "Bhedarganj Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Damudya পৌরসভা",
            "nameEn": "Damudya Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "টাঙ্গাইল",
        "nameEn": "Tangail",
        "upazilas": [
          {
            "name": "টাঙ্গাইল পৌরসভা",
            "nameEn": "Tangail Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              },
              {
                "name": "ওয়ার্ড নং-10",
                "nameEn": "Ward No-10"
              },
              {
                "name": "ওয়ার্ড নং-11",
                "nameEn": "Ward No-11"
              },
              {
                "name": "ওয়ার্ড নং-12",
                "nameEn": "Ward No-12"
              },
              {
                "name": "ওয়ার্ড নং-13",
                "nameEn": "Ward No-13"
              },
              {
                "name": "ওয়ার্ড নং-14",
                "nameEn": "Ward No-14"
              },
              {
                "name": "ওয়ার্ড নং-15",
                "nameEn": "Ward No-15"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "টাঙ্গাইল সদর উপজেলা",
            "nameEn": "Basail",
            "unions": [
              {
                "name": "বাসাইল",
                "nameEn": "বাসাইল"
              },
              {
                "name": "ফুলকী",
                "nameEn": "ফুলকী"
              },
              {
                "name": "কাশিল",
                "nameEn": "কাশিল"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কালিহাতি উপজেলা",
            "nameEn": "Bhuapur",
            "unions": [
              {
                "name": "ভূঞাপুর",
                "nameEn": "ভূঞাপুর"
              },
              {
                "name": "অলোয়া",
                "nameEn": "অলোয়া"
              },
              {
                "name": "ফলদা",
                "nameEn": "ফলদা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ঘাটাইল উপজেলা",
            "nameEn": "Delduar",
            "unions": [
              {
                "name": "দেলদুয়ার",
                "nameEn": "দেলদুয়ার"
              },
              {
                "name": "পাথরাইল",
                "nameEn": "পাথরাইল"
              },
              {
                "name": "আটিয়া",
                "nameEn": "আটিয়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বাসাইল উপজেলা",
            "nameEn": "Dhanbari",
            "unions": [
              {
                "name": "ধনবাড়ী",
                "nameEn": "ধনবাড়ী"
              },
              {
                "name": "বীরবাসন্দা",
                "nameEn": "বীরবাসন্দা"
              },
              {
                "name": "মুশুদ্দি",
                "nameEn": "মুশুদ্দি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "গোপালপুর উপজেলা",
            "nameEn": "Ghatail",
            "unions": [
              {
                "name": "ঘাটাইল",
                "nameEn": "ঘাটাইল"
              },
              {
                "name": "ডিঘলকান্দি",
                "nameEn": "ডিঘলকান্দি"
              },
              {
                "name": "দেওহাটা",
                "nameEn": "দেওহাটা"
              },
              {
                "name": "রশিদপুর",
                "nameEn": "রশিদপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মির্জাপুর উপজেলা",
            "nameEn": "Gopalpur",
            "unions": [
              {
                "name": "গোপালপুর",
                "nameEn": "গোপালপুর"
              },
              {
                "name": "হাদিরা",
                "nameEn": "হাদিরা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ভূঞাপুর উপজেলা",
            "nameEn": "Kalihati",
            "unions": [
              {
                "name": "কালিহাতী",
                "nameEn": "কালিহাতী"
              },
              {
                "name": "নাগরপুর",
                "nameEn": "নাগরপুর"
              },
              {
                "name": "বল্লা",
                "nameEn": "বল্লা"
              },
              {
                "name": "শহজানী",
                "nameEn": "শহজানী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "নাগরপুর উপজেলা",
            "nameEn": "Madhupur",
            "unions": [
              {
                "name": "মধুপুর",
                "nameEn": "মধুপুর"
              },
              {
                "name": "আউশনারা",
                "nameEn": "আউশনারা"
              },
              {
                "name": "ধোবাউড়া",
                "nameEn": "ধোবাউড়া"
              },
              {
                "name": "মীরজাপুর",
                "nameEn": "মীরজাপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মধুপুর উপজেলা",
            "nameEn": "Mirzapur",
            "unions": [
              {
                "name": "মির্জাপুর",
                "nameEn": "মির্জাপুর"
              },
              {
                "name": "ওয়ারী",
                "nameEn": "ওয়ারী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "সখিপুর উপজেলা",
            "nameEn": "Nagarpur",
            "unions": [
              {
                "name": "নাগরপুর",
                "nameEn": "নাগরপুর"
              },
              {
                "name": "দুবইল",
                "nameEn": "দুবইল"
              },
              {
                "name": "ধুবড়িয়া",
                "nameEn": "ধুবড়িয়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "দেলদুয়ার উপজেলা",
            "nameEn": "Shakhipur",
            "unions": [
              {
                "name": "সখিপুর",
                "nameEn": "সখিপুর"
              },
              {
                "name": "কাকড়াজান",
                "nameEn": "কাকড়াজান"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ধনবাড়ী উপজেলা",
            "nameEn": "Tangail Sadar",
            "unions": [
              {
                "name": "টাঙ্গাইল সদর",
                "nameEn": "টাঙ্গাইল সদর"
              },
              {
                "name": "কাকুয়া",
                "nameEn": "কাকুয়া"
              },
              {
                "name": "ঠেগারপুর",
                "nameEn": "ঠেগারপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Mirzapur পৌরসভা",
            "nameEn": "Mirzapur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Gopalpur পৌরসভা",
            "nameEn": "Gopalpur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Sakhipur পৌরসভা",
            "nameEn": "Sakhipur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Madhupur পৌরসভা",
            "nameEn": "Madhupur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Ghatail পৌরসভা",
            "nameEn": "Ghatail Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Kalihati পৌরসভা",
            "nameEn": "Kalihati Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Nagarpur পৌরসভা",
            "nameEn": "Nagarpur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Basail পৌরসভা",
            "nameEn": "Basail Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Delduar পৌরসভা",
            "nameEn": "Delduar Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Bhuapur পৌরসভা",
            "nameEn": "Bhuapur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Dhanbari পৌরসভা",
            "nameEn": "Dhanbari Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Elenga পৌরসভা",
            "nameEn": "Elenga Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      }
    ]
  },
  {
    "name": "বরিশাল",
    "nameEn": "Barishal",
    "districts": [
      {
        "name": "বরগুনা",
        "nameEn": "Barguna",
        "upazilas": [
          {
            "name": "বরগুনা পৌরসভা",
            "nameEn": "Barguna Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "বরগুনা সদর",
            "nameEn": "Amtali",
            "unions": [
              {
                "name": "আমতলী",
                "nameEn": "আমতলী"
              },
              {
                "name": "আঠারোগাছিয়া",
                "nameEn": "আঠারোগাছিয়া"
              },
              {
                "name": "গুলিশাখালী",
                "nameEn": "গুলিশাখালী"
              },
              {
                "name": "চাওরা",
                "nameEn": "চাওরা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "আমতলী",
            "nameEn": "Bamna",
            "unions": [
              {
                "name": "বামনা",
                "nameEn": "বামনা"
              },
              {
                "name": "বামনা",
                "nameEn": "বামনা"
              },
              {
                "name": "ডাউকাঠি",
                "nameEn": "ডাউকাঠি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বেতাগী",
            "nameEn": "Barguna Sadar",
            "unions": [
              {
                "name": "বরগুনা সদর",
                "nameEn": "বরগুনা সদর"
              },
              {
                "name": "বুড়িরচর",
                "nameEn": "বুড়িরচর"
              },
              {
                "name": "কেওড়াবুনিয়া",
                "nameEn": "কেওড়াবুনিয়া"
              },
              {
                "name": "ফুলঝুরি",
                "nameEn": "ফুলঝুরি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বামনা",
            "nameEn": "Betagi",
            "unions": [
              {
                "name": "বেতাগী",
                "nameEn": "বেতাগী"
              },
              {
                "name": "হোসনাবাদ",
                "nameEn": "হোসনাবাদ"
              },
              {
                "name": "বুড়িরচর",
                "nameEn": "বুড়িরচর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "পাথরঘাটা",
            "nameEn": "Patharghata",
            "unions": [
              {
                "name": "পাথরঘাটা",
                "nameEn": "পাথরঘাটা"
              },
              {
                "name": "কাকচিড়া",
                "nameEn": "কাকচিড়া"
              },
              {
                "name": "চরদুয়ানী",
                "nameEn": "চরদুয়ানী"
              },
              {
                "name": "গুলিশাখালী",
                "nameEn": "গুলিশাখালী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "তালতলী",
            "nameEn": "Taltali",
            "unions": [
              {
                "name": "তালতলী",
                "nameEn": "তালতলী"
              },
              {
                "name": "সরিষাবাড়িয়া",
                "nameEn": "সরিষাবাড়িয়া"
              },
              {
                "name": "নিশানবাড়িয়া",
                "nameEn": "নিশানবাড়িয়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Amtali পৌরসভা",
            "nameEn": "Amtali Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Betagi পৌরসভা",
            "nameEn": "Betagi Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Bamna পৌরসভা",
            "nameEn": "Bamna Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Patharghata পৌরসভা",
            "nameEn": "Patharghata Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "বরিশাল",
        "nameEn": "Barisal",
        "upazilas": [
          {
            "name": "বরিশাল সিটি কর্পোরেশন",
            "nameEn": "Barishal City Corporation",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              },
              {
                "name": "ওয়ার্ড নং-10",
                "nameEn": "Ward No-10"
              },
              {
                "name": "ওয়ার্ড নং-11",
                "nameEn": "Ward No-11"
              },
              {
                "name": "ওয়ার্ড নং-12",
                "nameEn": "Ward No-12"
              },
              {
                "name": "ওয়ার্ড নং-13",
                "nameEn": "Ward No-13"
              },
              {
                "name": "ওয়ার্ড নং-14",
                "nameEn": "Ward No-14"
              },
              {
                "name": "ওয়ার্ড নং-15",
                "nameEn": "Ward No-15"
              },
              {
                "name": "ওয়ার্ড নং-16",
                "nameEn": "Ward No-16"
              },
              {
                "name": "ওয়ার্ড নং-17",
                "nameEn": "Ward No-17"
              },
              {
                "name": "ওয়ার্ড নং-18",
                "nameEn": "Ward No-18"
              },
              {
                "name": "ওয়ার্ড নং-19",
                "nameEn": "Ward No-19"
              },
              {
                "name": "ওয়ার্ড নং-20",
                "nameEn": "Ward No-20"
              },
              {
                "name": "ওয়ার্ড নং-21",
                "nameEn": "Ward No-21"
              },
              {
                "name": "ওয়ার্ড নং-22",
                "nameEn": "Ward No-22"
              },
              {
                "name": "ওয়ার্ড নং-23",
                "nameEn": "Ward No-23"
              },
              {
                "name": "ওয়ার্ড নং-24",
                "nameEn": "Ward No-24"
              },
              {
                "name": "ওয়ার্ড নং-25",
                "nameEn": "Ward No-25"
              },
              {
                "name": "ওয়ার্ড নং-26",
                "nameEn": "Ward No-26"
              },
              {
                "name": "ওয়ার্ড নং-27",
                "nameEn": "Ward No-27"
              },
              {
                "name": "ওয়ার্ড নং-28",
                "nameEn": "Ward No-28"
              },
              {
                "name": "ওয়ার্ড নং-29",
                "nameEn": "Ward No-29"
              },
              {
                "name": "ওয়ার্ড নং-30",
                "nameEn": "Ward No-30"
              }
            ],
            "type": "city_corporation"
          },
          {
            "name": "বরিশাল সদর",
            "nameEn": "Barisal Sadar",
            "unions": [
              {
                "name": "বরিশাল সদর",
                "nameEn": "বরিশাল সদর"
              },
              {
                "name": "কাশীপুর",
                "nameEn": "কাশীপুর"
              },
              {
                "name": "রুপাতলী",
                "nameEn": "রুপাতলী"
              },
              {
                "name": "চরকাউয়া",
                "nameEn": "চরকাউয়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "গৌরনদী",
            "nameEn": "Gournadi",
            "unions": [
              {
                "name": "গৌরনদী",
                "nameEn": "গৌরনদী"
              },
              {
                "name": "বাটাজোর",
                "nameEn": "বাটাজোর"
              },
              {
                "name": "মাহিলারা",
                "nameEn": "মাহিলারা"
              },
              {
                "name": "চরআমদ্দি",
                "nameEn": "চরআমদ্দি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মুলাদী",
            "nameEn": "Muladi",
            "unions": [
              {
                "name": "মুলাদী",
                "nameEn": "মুলাদী"
              },
              {
                "name": "চরকালেখান",
                "nameEn": "চরকালেখান"
              },
              {
                "name": "গালুয়া",
                "nameEn": "গালুয়া"
              },
              {
                "name": "সফিপুর",
                "nameEn": "সফিপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মেহেন্দিগঞ্জ",
            "nameEn": "Mehendiganj",
            "unions": [
              {
                "name": "মেহেন্দীগঞ্জ",
                "nameEn": "মেহেন্দীগঞ্জ"
              },
              {
                "name": "চরগোপালপুর",
                "nameEn": "চরগোপালপুর"
              },
              {
                "name": "চরইকড়ি",
                "nameEn": "চরইকড়ি"
              },
              {
                "name": "বিদ্যানন্দকাটি",
                "nameEn": "বিদ্যানন্দকাটি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বাবুগঞ্জ",
            "nameEn": "Babuganj",
            "unions": [
              {
                "name": "বাবুগঞ্জ",
                "nameEn": "বাবুগঞ্জ"
              },
              {
                "name": "চাঁদপুরা",
                "nameEn": "চাঁদপুরা"
              },
              {
                "name": "রহমতপুর",
                "nameEn": "রহমতপুর"
              },
              {
                "name": "মাধবকাটি",
                "nameEn": "মাধবকাটি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "হিজলা",
            "nameEn": "Hizla",
            "unions": [
              {
                "name": "হিজলা",
                "nameEn": "হিজলা"
              },
              {
                "name": "গুয়াবাড়িয়া",
                "nameEn": "গুয়াবাড়িয়া"
              },
              {
                "name": "ভারপাশা",
                "nameEn": "ভারপাশা"
              },
              {
                "name": "মেহেন্দীগঞ্জ",
                "nameEn": "মেহেন্দীগঞ্জ"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "উজিরপুর",
            "nameEn": "Uzirpur",
            "unions": [
              {
                "name": "উজিরপুর",
                "nameEn": "উজিরপুর"
              },
              {
                "name": "শিকারপুর",
                "nameEn": "শিকারপুর"
              },
              {
                "name": "সাতলা",
                "nameEn": "সাতলা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বাকেরগঞ্জ",
            "nameEn": "Bakerganj",
            "unions": [
              {
                "name": "বাকেরগঞ্জ",
                "nameEn": "বাকেরগঞ্জ"
              },
              {
                "name": "বাউফল",
                "nameEn": "বাউফল"
              },
              {
                "name": "চরামদ্দি",
                "nameEn": "চরামদ্দি"
              },
              {
                "name": "দাড়িয়ালচর",
                "nameEn": "দাড়িয়ালচর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "আগৈলঝাড়া",
            "nameEn": "Agailjhara",
            "unions": [
              {
                "name": "আগৈলঝাড়া",
                "nameEn": "আগৈলঝাড়া"
              },
              {
                "name": "গৈলা",
                "nameEn": "গৈলা"
              },
              {
                "name": "বাগধা",
                "nameEn": "বাগধা"
              },
              {
                "name": "রত্নপুর",
                "nameEn": "রত্নপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বানারীপাড়া",
            "nameEn": "Banaripara",
            "unions": [
              {
                "name": "বানারীপাড়া",
                "nameEn": "বানারীপাড়া"
              },
              {
                "name": "সৈয়দকাঠি",
                "nameEn": "সৈয়দকাঠি"
              },
              {
                "name": "ইলুহার",
                "nameEn": "ইলুহার"
              },
              {
                "name": "চাখার",
                "nameEn": "চাখার"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Bakerganj পৌরসভা",
            "nameEn": "Bakerganj Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Babuganj পৌরসভা",
            "nameEn": "Babuganj Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Banaripara পৌরসভা",
            "nameEn": "Banaripara Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Gournadi পৌরসভা",
            "nameEn": "Gournadi Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Agailjhara পৌরসভা",
            "nameEn": "Agailjhara Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Muladi পৌরসভা",
            "nameEn": "Muladi Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Mehendiganj পৌরসভা",
            "nameEn": "Mehendiganj Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Hizla পৌরসভা",
            "nameEn": "Hizla Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Wazirpur পৌরসভা",
            "nameEn": "Wazirpur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "ভোলা",
        "nameEn": "Bhola",
        "upazilas": [
          {
            "name": "ভোলা পৌরসভা",
            "nameEn": "Bhola Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "ভোলা সদর",
            "nameEn": "Borhanuddin",
            "unions": [
              {
                "name": "বোরহানউদ্দিন",
                "nameEn": "বোরহানউদ্দিন"
              },
              {
                "name": "দেউলা",
                "nameEn": "দেউলা"
              },
              {
                "name": "সাচড়া",
                "nameEn": "সাচড়া"
              },
              {
                "name": "দেনায়েতপুর",
                "nameEn": "দেনায়েতপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বোরহান উদ্দিন",
            "nameEn": "Charfassion",
            "unions": [
              {
                "name": "চরফ্যাশন",
                "nameEn": "চরফ্যাশন"
              },
              {
                "name": "চরমাণিকা",
                "nameEn": "চরমাণিকা"
              },
              {
                "name": "আশ্বাদনগর",
                "nameEn": "আশ্বাদনগর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "দৌলতখান",
            "nameEn": "Daulatkhan",
            "unions": [
              {
                "name": "দৌলতখান",
                "nameEn": "দৌলতখান"
              },
              {
                "name": "সাদুল্লাপুর",
                "nameEn": "সাদুল্লাপুর"
              },
              {
                "name": "মদনপুর",
                "nameEn": "মদনপুর"
              },
              {
                "name": "চরখলিফা",
                "nameEn": "চরখলিফা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "লালমোহন",
            "nameEn": "Lalmohan",
            "unions": [
              {
                "name": "লালমোহন",
                "nameEn": "লালমোহন"
              },
              {
                "name": "চরবাংলা",
                "nameEn": "চরবাংলা"
              },
              {
                "name": "কালমেঘা",
                "nameEn": "কালমেঘা"
              },
              {
                "name": "পাতারহাট",
                "nameEn": "পাতারহাট"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "তজুমদ্দিন",
            "nameEn": "Monpura",
            "unions": [
              {
                "name": "মনপুরা",
                "nameEn": "মনপুরা"
              },
              {
                "name": "সাকুচিয়া",
                "nameEn": "সাকুচিয়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "চরফ্যাশন",
            "nameEn": "Tazumuddin",
            "unions": [
              {
                "name": "তজুমউদ্দিন",
                "nameEn": "তজুমউদ্দিন"
              },
              {
                "name": "চরনিজাম",
                "nameEn": "চরনিজাম"
              },
              {
                "name": "শশীভূষণ",
                "nameEn": "শশীভূষণ"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মনপুরা",
            "nameEn": "মনপুরা",
            "unions": [
              {
                "name": "মনপুরা",
                "nameEn": "মনপুরা"
              },
              {
                "name": "সাকুচিয়া",
                "nameEn": "সাকুচিয়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Borhanuddin পৌরসভা",
            "nameEn": "Borhanuddin Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Charfassion পৌরসভা",
            "nameEn": "Charfassion Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Daulatkhan পৌরসভা",
            "nameEn": "Daulatkhan Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Lalmohan পৌরসভা",
            "nameEn": "Lalmohan Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Tazumuddin পৌরসভা",
            "nameEn": "Tazumuddin Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Manpura পৌরসভা",
            "nameEn": "Manpura Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "ঝালকাঠি",
        "nameEn": "Jhalokathi",
        "upazilas": [
          {
            "name": "ঝালকাঠি পৌরসভা",
            "nameEn": "Jhalokathi Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "ঝালকাঠি সদর উপজেলা",
            "nameEn": "Tazumuddin",
            "unions": [
              {
                "name": "তজুমউদ্দিন",
                "nameEn": "তজুমউদ্দিন"
              },
              {
                "name": "চরনিজাম",
                "nameEn": "চরনিজাম"
              },
              {
                "name": "শশীভূষণ",
                "nameEn": "শশীভূষণ"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কাঁঠালিয়া উপজেলা",
            "nameEn": "Jhalokathi Sadar",
            "unions": [
              {
                "name": "ঝালকাঠি সদর",
                "nameEn": "ঝালকাঠি সদর"
              },
              {
                "name": "কীর্তিপাশা",
                "nameEn": "কীর্তিপাশা"
              },
              {
                "name": "গাবখান",
                "nameEn": "গাবখান"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "নলছিটি উপজেলা",
            "nameEn": "Kathalia",
            "unions": [
              {
                "name": "কাঠালিয়া",
                "nameEn": "কাঠালিয়া"
              },
              {
                "name": "শওলজালিয়া",
                "nameEn": "শওলজালিয়া"
              },
              {
                "name": "পাটিকেলঘাটা",
                "nameEn": "পাটিকেলঘাটা"
              },
              {
                "name": "আমুয়া",
                "nameEn": "আমুয়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "রাজাপুর উপজেলা",
            "nameEn": "Nalchity",
            "unions": [
              {
                "name": "নলছিটি",
                "nameEn": "নলছিটি"
              },
              {
                "name": "বারৈকরণ",
                "nameEn": "বারৈকরণ"
              },
              {
                "name": "ভীমরুলী",
                "nameEn": "ভীমরুলী"
              },
              {
                "name": "দামোদর",
                "nameEn": "দামোদর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Kathalia পৌরসভা",
            "nameEn": "Kathalia Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Nalchity পৌরসভা",
            "nameEn": "Nalchity Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Rajapur পৌরসভা",
            "nameEn": "Rajapur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "পটুয়াখালী",
        "nameEn": "Patuakhali",
        "upazilas": [
          {
            "name": "পটুয়াখালী পৌরসভা",
            "nameEn": "Patuakhali Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "পটুয়াখালী সদর উপজেলা",
            "nameEn": "Bauphal",
            "unions": [
              {
                "name": "বাউফল",
                "nameEn": "বাউফল"
              },
              {
                "name": "বেতাগী",
                "nameEn": "বেতাগী"
              },
              {
                "name": "মদনপুর",
                "nameEn": "মদনপুর"
              },
              {
                "name": "কেশবপুর",
                "nameEn": "কেশবপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বাউফল উপজেলা",
            "nameEn": "Dashmina",
            "unions": [
              {
                "name": "দশমিনা",
                "nameEn": "দশমিনা"
              },
              {
                "name": "চরবাংলা",
                "nameEn": "চরবাংলা"
              },
              {
                "name": "চরহরিণা",
                "nameEn": "চরহরিণা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "দশমিনা উপজেলা",
            "nameEn": "Dumki",
            "unions": [
              {
                "name": "দুমকী",
                "nameEn": "দুমকী"
              },
              {
                "name": "পাঙ্গাশিয়া",
                "nameEn": "পাঙ্গাশিয়া"
              },
              {
                "name": "মুরাদিয়া",
                "nameEn": "মুরাদিয়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "গলাচিপা উপজেলা",
            "nameEn": "Galachipa",
            "unions": [
              {
                "name": "গলাচিপা",
                "nameEn": "গলাচিপা"
              },
              {
                "name": "চররমিজ",
                "nameEn": "চররমিজ"
              },
              {
                "name": "ডাকুয়া",
                "nameEn": "ডাকুয়া"
              },
              {
                "name": "পানপট্টি",
                "nameEn": "পানপট্টি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কলাপাড়া উপজেলা",
            "nameEn": "Kalapara",
            "unions": [
              {
                "name": "কলাপাড়া",
                "nameEn": "কলাপাড়া"
              },
              {
                "name": "চাকামইয়া",
                "nameEn": "চাকামইয়া"
              },
              {
                "name": "ধানখালী",
                "nameEn": "ধানখালী"
              },
              {
                "name": "লতাচাপলী",
                "nameEn": "লতাচাপলী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মির্জাগঞ্জ উপজেলা",
            "nameEn": "Mirjaganj",
            "unions": [
              {
                "name": "মির্জাগঞ্জ",
                "nameEn": "মির্জাগঞ্জ"
              },
              {
                "name": "মাদারবুনিয়া",
                "nameEn": "মাদারবুনিয়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "দুমকি উপজেলা",
            "nameEn": "Patuakhali Sadar",
            "unions": [
              {
                "name": "পটুয়াখালী সদর",
                "nameEn": "পটুয়াখালী সদর"
              },
              {
                "name": "লৌহালিয়া",
                "nameEn": "লৌহালিয়া"
              },
              {
                "name": "কামলাপুর",
                "nameEn": "কামলাপুর"
              },
              {
                "name": "মির্জাগঞ্জ",
                "nameEn": "মির্জাগঞ্জ"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "রাঙ্গাবালী উপজেলা",
            "nameEn": "Rangabali",
            "unions": [
              {
                "name": "রাঙ্গাবালী",
                "nameEn": "রাঙ্গাবালী"
              },
              {
                "name": "চররুকনুদ্দিন",
                "nameEn": "চররুকনুদ্দিন"
              },
              {
                "name": "চরসাপেলা",
                "nameEn": "চরসাপেলা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Galachipa পৌরসভা",
            "nameEn": "Galachipa Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Dashmina পৌরসভা",
            "nameEn": "Dashmina Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Kalapara পৌরসভা",
            "nameEn": "Kalapara Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Mirzaganj পৌরসভা",
            "nameEn": "Mirzaganj Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Dumki পৌরসভা",
            "nameEn": "Dumki Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Bauphal পৌরসভা",
            "nameEn": "Bauphal Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Rangabali পৌরসভা",
            "nameEn": "Rangabali Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "পিরোজপুর",
        "nameEn": "Pirojpur",
        "upazilas": [
          {
            "name": "পিরোজপুর পৌরসভা",
            "nameEn": "Pirojpur Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "ভান্ডারিয়া উপজেলা",
            "nameEn": "Bhandaria",
            "unions": [
              {
                "name": "ভান্ডারিয়া",
                "nameEn": "ভান্ডারিয়া"
              },
              {
                "name": "ঝগরাবিল",
                "nameEn": "ঝগরাবিল"
              },
              {
                "name": "তেলিহাটি",
                "nameEn": "তেলিহাটি"
              },
              {
                "name": "ধোপাখালী",
                "nameEn": "ধোপাখালী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কাউখালী উপজেলা",
            "nameEn": "Kawkhali",
            "unions": [
              {
                "name": "কাউখালী",
                "nameEn": "কাউখালী"
              },
              {
                "name": "চিড়াপাতা",
                "nameEn": "চিড়াপাতা"
              },
              {
                "name": "শিয়ালকাঠি",
                "nameEn": "শিয়ালকাঠি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মঠবাড়িয়া উপজেলা",
            "nameEn": "Mothbaria",
            "unions": [
              {
                "name": "মঠবাড়িয়া",
                "nameEn": "মঠবাড়িয়া"
              },
              {
                "name": "তুষখালী",
                "nameEn": "তুষখালী"
              },
              {
                "name": "গুলিশাখালী",
                "nameEn": "গুলিশাখালী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "নাজিরপুর উপজেলা",
            "nameEn": "Nazirpur",
            "unions": [
              {
                "name": "নাজিরপুর",
                "nameEn": "নাজিরপুর"
              },
              {
                "name": "পারেরহাট",
                "nameEn": "পারেরহাট"
              },
              {
                "name": "শ্রীরামকাঠি",
                "nameEn": "শ্রীরামকাঠি"
              },
              {
                "name": "মালিখালী",
                "nameEn": "মালিখালী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "পিরোজপুর সদর উপজেলা",
            "nameEn": "Nesarabad",
            "unions": [
              {
                "name": "নেছারাবাদ",
                "nameEn": "নেছারাবাদ"
              },
              {
                "name": "শেখেরহাট",
                "nameEn": "শেখেরহাট"
              },
              {
                "name": "দেউলবাড়ী",
                "nameEn": "দেউলবাড়ী"
              },
              {
                "name": "বারোইপাড়া",
                "nameEn": "বারোইপাড়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "নেছারাবাদ উপজেলা",
            "nameEn": "Pirojpur Sadar",
            "unions": [
              {
                "name": "পিরোজপুর সদর",
                "nameEn": "পিরোজপুর সদর"
              },
              {
                "name": "সদরপুর",
                "nameEn": "সদরপুর"
              },
              {
                "name": "শাখারী",
                "nameEn": "শাখারী"
              },
              {
                "name": "কদমতলা",
                "nameEn": "কদমতলা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ইন্দুরকানী উপজেলা",
            "nameEn": "Zianagar",
            "unions": [
              {
                "name": "জিয়ানগর",
                "nameEn": "জিয়ানগর"
              },
              {
                "name": "পশ্চিমবুনিয়া",
                "nameEn": "পশ্চিমবুনিয়া"
              },
              {
                "name": "দুর্গাপাশা",
                "nameEn": "দুর্গাপাশা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Bhandaria পৌরসভা",
            "nameEn": "Bhandaria Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Kawkhali পৌরসভা",
            "nameEn": "Kawkhali Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Mathbaria পৌরসভা",
            "nameEn": "Mathbaria Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Nazirpur পৌরসভা",
            "nameEn": "Nazirpur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Nesarabad পৌরসভা",
            "nameEn": "Nesarabad Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Indurkani পৌরসভা",
            "nameEn": "Indurkani Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      }
    ]
  },
  {
    "name": "ময়মনসিংহ",
    "nameEn": "Mymensingh",
    "districts": [
      {
        "name": "জামালপুর",
        "nameEn": "জামালপুর",
        "upazilas": [
          {
            "name": "জামালপুর পৌরসভা",
            "nameEn": "Jamalpur Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "জামালপুর সদর উপজেলা",
            "nameEn": "জামালপুর সদর",
            "unions": [
              {
                "name": "জামালপুর সদর",
                "nameEn": "জামালপুর সদর"
              },
              {
                "name": "গুনেরচর",
                "nameEn": "গুনেরচর"
              },
              {
                "name": "রানাগাছা",
                "nameEn": "রানাগাছা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বকশীগঞ্জ উপজেলা",
            "nameEn": "বকশীগঞ্জ",
            "unions": [
              {
                "name": "বকশীগঞ্জ",
                "nameEn": "বকশীগঞ্জ"
              },
              {
                "name": "মেরুরচর",
                "nameEn": "মেরুরচর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "দেওয়ানগঞ্জ উপজেলা",
            "nameEn": "দেওয়ানগঞ্জ",
            "unions": [
              {
                "name": "দেওয়ানগঞ্জ",
                "nameEn": "দেওয়ানগঞ্জ"
              },
              {
                "name": "বাহাদুরাবাদ",
                "nameEn": "বাহাদুরাবাদ"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ইসলামপুর উপজেলা",
            "nameEn": "ইসলামপুর",
            "unions": [
              {
                "name": "ইসলামপুর",
                "nameEn": "ইসলামপুর"
              },
              {
                "name": "গৈরহাটা",
                "nameEn": "গৈরহাটা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মাদারগঞ্জ উপজেলা",
            "nameEn": "মাদারগঞ্জ",
            "unions": [
              {
                "name": "মাদারগঞ্জ",
                "nameEn": "মাদারগঞ্জ"
              },
              {
                "name": "গুনারীতলা",
                "nameEn": "গুনারীতলা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মেলান্দহ উপজেলা",
            "nameEn": "মেলান্দহ",
            "unions": [
              {
                "name": "মেলান্দহ",
                "nameEn": "মেলান্দহ"
              },
              {
                "name": "নান্দিনা",
                "nameEn": "নান্দিনা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "সরিষাবাড়ি উপজেলা",
            "nameEn": "সরিষাবাড়ি",
            "unions": [
              {
                "name": "সরিষাবাড়ী",
                "nameEn": "সরিষাবাড়ী"
              },
              {
                "name": "পিংনা",
                "nameEn": "পিংনা"
              }
            ],
            "type": "upazila"
          }
        ]
      },
      {
        "name": "ময়মনসিংহ",
        "nameEn": "ময়মনসিংহ",
        "upazilas": [
          {
            "name": "ময়মনসিংহ সিটি কর্পোরেশন",
            "nameEn": "Mymensingh City Corporation",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              },
              {
                "name": "ওয়ার্ড নং-10",
                "nameEn": "Ward No-10"
              },
              {
                "name": "ওয়ার্ড নং-11",
                "nameEn": "Ward No-11"
              },
              {
                "name": "ওয়ার্ড নং-12",
                "nameEn": "Ward No-12"
              },
              {
                "name": "ওয়ার্ড নং-13",
                "nameEn": "Ward No-13"
              },
              {
                "name": "ওয়ার্ড নং-14",
                "nameEn": "Ward No-14"
              },
              {
                "name": "ওয়ার্ড নং-15",
                "nameEn": "Ward No-15"
              },
              {
                "name": "ওয়ার্ড নং-16",
                "nameEn": "Ward No-16"
              },
              {
                "name": "ওয়ার্ড নং-17",
                "nameEn": "Ward No-17"
              },
              {
                "name": "ওয়ার্ড নং-18",
                "nameEn": "Ward No-18"
              },
              {
                "name": "ওয়ার্ড নং-19",
                "nameEn": "Ward No-19"
              },
              {
                "name": "ওয়ার্ড নং-20",
                "nameEn": "Ward No-20"
              },
              {
                "name": "ওয়ার্ড নং-21",
                "nameEn": "Ward No-21"
              }
            ],
            "type": "city_corporation"
          },
          {
            "name": "ময়মনসিংহ সদর",
            "nameEn": "ময়মনসিংহ সদর",
            "unions": [
              {
                "name": "ময়মনসিংহ সদর সদর",
                "nameEn": "ময়মনসিংহ সদর Sadar"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ফুলবাড়িয়া",
            "nameEn": "ফুলবাড়িয়া",
            "unions": [
              {
                "name": "ফুলবাড়িয়া সদর",
                "nameEn": "ফুলবাড়িয়া Sadar"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ত্রিশাল",
            "nameEn": "ত্রিশাল",
            "unions": [
              {
                "name": "ত্রিশাল",
                "nameEn": "ত্রিশাল"
              },
              {
                "name": "ধানীখোলা",
                "nameEn": "ধানীখোলা"
              },
              {
                "name": "বলিপাড়া",
                "nameEn": "বলিপাড়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ভালুকা",
            "nameEn": "ভালুকা",
            "unions": [
              {
                "name": "ভালুকা",
                "nameEn": "ভালুকা"
              },
              {
                "name": "রাজৈ",
                "nameEn": "রাজৈ"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মুক্তাগাছা",
            "nameEn": "মুক্তাগাছা",
            "unions": [
              {
                "name": "মুক্তাগাছা",
                "nameEn": "মুক্তাগাছা"
              },
              {
                "name": "মানকোণা",
                "nameEn": "মানকোণা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ধোবাউড়া",
            "nameEn": "ধোবাউড়া",
            "unions": [
              {
                "name": "ধোবাউড়া সদর",
                "nameEn": "ধোবাউড়া Sadar"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ফুলপুর",
            "nameEn": "ফুলপুর",
            "unions": [
              {
                "name": "ফুলপুর",
                "nameEn": "ফুলপুর"
              },
              {
                "name": "বৈরাটী",
                "nameEn": "বৈরাটী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "হালুয়াঘাট",
            "nameEn": "হালুয়াঘাট",
            "unions": [
              {
                "name": "হালুয়াঘাট সদর",
                "nameEn": "হালুয়াঘাট Sadar"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "গৌরীপুর",
            "nameEn": "গৌরীপুর",
            "unions": [
              {
                "name": "গৌরীপুর",
                "nameEn": "গৌরীপুর"
              },
              {
                "name": "শিবগঞ্জ",
                "nameEn": "শিবগঞ্জ"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "গফরগাঁও",
            "nameEn": "গফরগাঁও",
            "unions": [
              {
                "name": "গফরগাঁও",
                "nameEn": "গফরগাঁও"
              },
              {
                "name": "দুর্গাপুর",
                "nameEn": "দুর্গাপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ঈশ্বরগঞ্জ",
            "nameEn": "ঈশ্বরগঞ্জ",
            "unions": [
              {
                "name": "ঈশ্বরগঞ্জ",
                "nameEn": "ঈশ্বরগঞ্জ"
              },
              {
                "name": "সোহাগী",
                "nameEn": "সোহাগী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "নান্দাইল",
            "nameEn": "নান্দাইল",
            "unions": [
              {
                "name": "নান্দাইল",
                "nameEn": "নান্দাইল"
              },
              {
                "name": "মুসুল্লী",
                "nameEn": "মুসুল্লী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "তারাকান্দা",
            "nameEn": "তারাকান্দা",
            "unions": [
              {
                "name": "তারাকান্দা",
                "nameEn": "তারাকান্দা"
              },
              {
                "name": "কাকনী",
                "nameEn": "কাকনী"
              }
            ],
            "type": "upazila"
          }
        ]
      },
      {
        "name": "নেত্রকোনা",
        "nameEn": "নেত্রকোনা",
        "upazilas": [
          {
            "name": "নেত্রকোনা পৌরসভা",
            "nameEn": "Netrokona Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "নেত্রকোনা সদর",
            "nameEn": "নেত্রকোনা সদর",
            "unions": [
              {
                "name": "নেত্রকোণা সদর",
                "nameEn": "নেত্রকোণা সদর"
              },
              {
                "name": "মুক্তিজোধা",
                "nameEn": "মুক্তিজোধা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "আটপাড়া",
            "nameEn": "আটপাড়া",
            "unions": [
              {
                "name": "আটপাড়া",
                "nameEn": "আটপাড়া"
              },
              {
                "name": "চান্দগাজী",
                "nameEn": "চান্দগাজী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বারহাট্টা",
            "nameEn": "বারহাট্টা",
            "unions": [
              {
                "name": "বারহাট্টা",
                "nameEn": "বারহাট্টা"
              },
              {
                "name": "চিলারচর",
                "nameEn": "চিলারচর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "দুর্গাপুর",
            "nameEn": "দুর্গাপুর",
            "unions": [
              {
                "name": "দুর্গাপুর",
                "nameEn": "দুর্গাপুর"
              },
              {
                "name": "বিরিশিরি",
                "nameEn": "বিরিশিরি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "খালিয়াজুড়ি",
            "nameEn": "খালিয়াজুড়ি",
            "unions": [
              {
                "name": "খালিয়াজুরী",
                "nameEn": "খালিয়াজুরী"
              },
              {
                "name": "মেনকীফান্দি",
                "nameEn": "মেনকীফান্দি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কলমাকান্দা",
            "nameEn": "কলমাকান্দা",
            "unions": [
              {
                "name": "কলমাকান্দা",
                "nameEn": "কলমাকান্দা"
              },
              {
                "name": "খর্ণিয়া",
                "nameEn": "খর্ণিয়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কেন্দুয়া",
            "nameEn": "কেন্দুয়া",
            "unions": [
              {
                "name": "কেন্দুয়া",
                "nameEn": "কেন্দুয়া"
              },
              {
                "name": "মশিয়ালহাটি",
                "nameEn": "মশিয়ালহাটি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মদন",
            "nameEn": "মদন",
            "unions": [
              {
                "name": "মদন",
                "nameEn": "মদন"
              },
              {
                "name": "চন্দ্রনগর",
                "nameEn": "চন্দ্রনগর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মোহনগঞ্জ",
            "nameEn": "মোহনগঞ্জ",
            "unions": [
              {
                "name": "মোহনগঞ্জ",
                "nameEn": "মোহনগঞ্জ"
              },
              {
                "name": "গাগলাজুর",
                "nameEn": "গাগলাজুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "পূর্বধলা",
            "nameEn": "পূর্বধলা",
            "unions": [
              {
                "name": "পূর্বধলা",
                "nameEn": "পূর্বধলা"
              },
              {
                "name": "বিরাটী",
                "nameEn": "বিরাটী"
              }
            ],
            "type": "upazila"
          }
        ]
      },
      {
        "name": "শেরপুর",
        "nameEn": "শেরপুর",
        "upazilas": [
          {
            "name": "শেরপুর পৌরসভা",
            "nameEn": "Sherpur Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "শেরপুর সদর",
            "nameEn": "শেরপুর সদর",
            "unions": [
              {
                "name": "শেরপুর সদর",
                "nameEn": "শেরপুর সদর"
              },
              {
                "name": "খরমপুর",
                "nameEn": "খরমপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ঝিনাইগাতী",
            "nameEn": "ঝিনাইগাতী",
            "unions": [
              {
                "name": "ঝিনাইগাতী",
                "nameEn": "ঝিনাইগাতী"
              },
              {
                "name": "হাতিবান্দা",
                "nameEn": "হাতিবান্দা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "নকলা",
            "nameEn": "নকলা",
            "unions": [
              {
                "name": "নকলা",
                "nameEn": "নকলা"
              },
              {
                "name": "গণেশপুর",
                "nameEn": "গণেশপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "নালিতাবাড়ী",
            "nameEn": "নালিতাবাড়ী",
            "unions": [
              {
                "name": "নালিতাবাড়ী",
                "nameEn": "নালিতাবাড়ী"
              },
              {
                "name": "কলমাকান্দা",
                "nameEn": "কলমাকান্দা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "শ্রীবরদী",
            "nameEn": "শ্রীবরদী",
            "unions": [
              {
                "name": "শ্রীবর্দী",
                "nameEn": "শ্রীবর্দী"
              },
              {
                "name": "রঘুনাথপুর",
                "nameEn": "রঘুনাথপুর"
              }
            ],
            "type": "upazila"
          }
        ]
      }
    ]
  },
  {
    "name": "রংপুর",
    "nameEn": "Rangpur",
    "districts": [
      {
        "name": "দিনাজপুর",
        "nameEn": "Dinajpur",
        "upazilas": [
          {
            "name": "দিনাজপুর পৌরসভা",
            "nameEn": "Dinajpur Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              },
              {
                "name": "ওয়ার্ড নং-10",
                "nameEn": "Ward No-10"
              },
              {
                "name": "ওয়ার্ড নং-11",
                "nameEn": "Ward No-11"
              },
              {
                "name": "ওয়ার্ড নং-12",
                "nameEn": "Ward No-12"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "দিনাজপুর সদর",
            "nameEn": "Birampur",
            "unions": [
              {
                "name": "বিরামপুর",
                "nameEn": "বিরামপুর"
              },
              {
                "name": "কালোরহাট",
                "nameEn": "কালোরহাট"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বিরামপুর",
            "nameEn": "Birganj",
            "unions": [
              {
                "name": "বীরগঞ্জ",
                "nameEn": "বীরগঞ্জ"
              },
              {
                "name": "ভোগনগর",
                "nameEn": "ভোগনগর"
              },
              {
                "name": "মোহনপুর",
                "nameEn": "মোহনপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বীরগঞ্জ",
            "nameEn": "Birol",
            "unions": [
              {
                "name": "বিরল",
                "nameEn": "বিরল"
              },
              {
                "name": "কাটলাহার",
                "nameEn": "কাটলাহার"
              },
              {
                "name": "ফুলবাড়ী",
                "nameEn": "ফুলবাড়ী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বোচাগঞ্জ",
            "nameEn": "Bochaganj",
            "unions": [
              {
                "name": "বোচাগঞ্জ",
                "nameEn": "বোচাগঞ্জ"
              },
              {
                "name": "মিরজাপুর",
                "nameEn": "মিরজাপুর"
              },
              {
                "name": "গোবিন্দপুর",
                "nameEn": "গোবিন্দপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ফুলবাড়ী",
            "nameEn": "Chirirbandar",
            "unions": [
              {
                "name": "চিরিরবন্দর",
                "nameEn": "চিরিরবন্দর"
              },
              {
                "name": "পুলহাট",
                "nameEn": "পুলহাট"
              },
              {
                "name": "আউলিয়াপুর",
                "nameEn": "আউলিয়াপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "চিরিরবন্দর",
            "nameEn": "Dinajpur Sadar",
            "unions": [
              {
                "name": "দিনাজপুর সদর",
                "nameEn": "দিনাজপুর সদর"
              },
              {
                "name": "চেহেলগাজী",
                "nameEn": "চেহেলগাজী"
              },
              {
                "name": "আউলিয়াপুর",
                "nameEn": "আউলিয়াপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ঘোড়াঘাট",
            "nameEn": "Fulbari",
            "unions": [
              {
                "name": "ফুলবাড়ী",
                "nameEn": "ফুলবাড়ী"
              },
              {
                "name": "শিবরামপুর",
                "nameEn": "শিবরামপুর"
              },
              {
                "name": "খয়েরবাড়ী",
                "nameEn": "খয়েরবাড়ী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "হাকিমপুর",
            "nameEn": "Ghoraghat",
            "unions": [
              {
                "name": "ঘোড়াঘাট",
                "nameEn": "ঘোড়াঘাট"
              },
              {
                "name": "নিতপুর",
                "nameEn": "নিতপুর"
              },
              {
                "name": "সিংড়া",
                "nameEn": "সিংড়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কাহারোল",
            "nameEn": "Hakimpur",
            "unions": [
              {
                "name": "হাকিমপুর",
                "nameEn": "হাকিমপুর"
              },
              {
                "name": "পালপাড়া",
                "nameEn": "পালপাড়া"
              },
              {
                "name": "আনতাহার",
                "nameEn": "আনতাহার"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "খানসামা",
            "nameEn": "Kaharol",
            "unions": [
              {
                "name": "কাহারোল",
                "nameEn": "কাহারোল"
              },
              {
                "name": "রাণীরবন্দর",
                "nameEn": "রাণীরবন্দর"
              },
              {
                "name": "মুন্সীপাড়া",
                "nameEn": "মুন্সীপাড়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "নবাবগঞ্জ",
            "nameEn": "Khanshama",
            "unions": [
              {
                "name": "খানসামা",
                "nameEn": "খানসামা"
              },
              {
                "name": "আলোকজুরি",
                "nameEn": "আলোকজুরি"
              },
              {
                "name": "ভেলাবাড়ী",
                "nameEn": "ভেলাবাড়ী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "পার্বতীপুর",
            "nameEn": "Nawabganj",
            "unions": [
              {
                "name": "Nawabganj সদর",
                "nameEn": "Nawabganj Sadar"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বিরল",
            "nameEn": "Parbatipur",
            "unions": [
              {
                "name": "পার্বতীপুর",
                "nameEn": "পার্বতীপুর"
              },
              {
                "name": "হাবড়া",
                "nameEn": "হাবড়া"
              },
              {
                "name": "মোমিনপুর",
                "nameEn": "মোমিনপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Birampur পৌরসভা",
            "nameEn": "Birampur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Birganj পৌরসভা",
            "nameEn": "Birganj Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Biral পৌরসভা",
            "nameEn": "Biral Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Bochaganj পৌরসভা",
            "nameEn": "Bochaganj Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Chirirbandar পৌরসভা",
            "nameEn": "Chirirbandar Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Fulbari পৌরসভা",
            "nameEn": "Fulbari Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Ghoraghat পৌরসভা",
            "nameEn": "Ghoraghat Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Hakimpur পৌরসভা",
            "nameEn": "Hakimpur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Kaharole পৌরসভা",
            "nameEn": "Kaharole Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Khansama পৌরসভা",
            "nameEn": "Khansama Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Nawabganj পৌরসভা",
            "nameEn": "Nawabganj Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Parbatipur পৌরসভা",
            "nameEn": "Parbatipur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "গাইবান্ধা",
        "nameEn": "Gaibandha",
        "upazilas": [
          {
            "name": "গাইবান্ধা পৌরসভা",
            "nameEn": "Gaibandha Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "লক্ষ্মীপুর উপজেলা",
            "nameEn": "Fulchari",
            "unions": [
              {
                "name": "লক্ষ্মীপুর",
                "nameEn": "লক্ষ্মীপুর"
              },
              {
                "name": "মালিবাড়ী",
                "nameEn": "মালিবাড়ী"
              },
              {
                "name": "কুপতলা",
                "nameEn": "কুপতলা"
              },
              {
                "name": "সাহাপাড়া",
                "nameEn": "সাহাপাড়া"
              },
              {
                "name": "বল্লমঝাড়",
                "nameEn": "বল্লমঝাড়"
              },
              {
                "name": "রামচন্দ্রপুর",
                "nameEn": "রামচন্দ্রপুর"
              },
              {
                "name": "বাদিয়াখালী",
                "nameEn": "বাদিয়াখালী"
              },
              {
                "name": "বোয়ালী",
                "nameEn": "বোয়ালী"
              },
              {
                "name": "খোলাহাটী",
                "nameEn": "খোলাহাটী"
              },
              {
                "name": "ঘাগোয়া",
                "nameEn": "ঘাগোয়া"
              },
              {
                "name": "গিদারী",
                "nameEn": "গিদারী"
              },
              {
                "name": "কামারজানি",
                "nameEn": "কামারজানি"
              },
              {
                "name": "মোল্লারচর",
                "nameEn": "মোল্লারচর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ফুলছড়ি উপজেলা",
            "nameEn": "Gaibandha Sadar",
            "unions": [
              {
                "name": "কঞ্চিপাড়া",
                "nameEn": "কঞ্চিপাড়া"
              },
              {
                "name": "উড়িয়া",
                "nameEn": "উড়িয়া"
              },
              {
                "name": "উদাখালী",
                "nameEn": "উদাখালী"
              },
              {
                "name": "গজারিয়া",
                "nameEn": "গজারিয়া"
              },
              {
                "name": "ফুলছড়ি",
                "nameEn": "ফুলছড়ি"
              },
              {
                "name": "এরেন্ডাবাড়ী",
                "nameEn": "এরেন্ডাবাড়ী"
              },
              {
                "name": "ফজলুপুর",
                "nameEn": "ফজলুপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "গোবিন্দগঞ্জ উপজেলা",
            "nameEn": "Gobindaganj",
            "unions": [
              {
                "name": "মহিমাগঞ্জ",
                "nameEn": "মহিমাগঞ্জ"
              },
              {
                "name": "কামদিয়া",
                "nameEn": "কামদিয়া"
              },
              {
                "name": "শাখাহার",
                "nameEn": "শাখাহার"
              },
              {
                "name": "কাটাবাড়ী",
                "nameEn": "কাটাবাড়ী"
              },
              {
                "name": "রাজাহার",
                "nameEn": "রাজাহার"
              },
              {
                "name": "সাপমারা",
                "nameEn": "সাপমারা"
              },
              {
                "name": "দরবস্ত",
                "nameEn": "দরবস্ত"
              },
              {
                "name": "তালুককানুপুর",
                "nameEn": "তালুককানুপুর"
              },
              {
                "name": "নাকাই",
                "nameEn": "নাকাই"
              },
              {
                "name": "হরিরামপুর",
                "nameEn": "হরিরামপুর"
              },
              {
                "name": "রাখালবুরুজ",
                "nameEn": "রাখালবুরুজ"
              },
              {
                "name": "ফুলবাড়ী",
                "nameEn": "ফুলবাড়ী"
              },
              {
                "name": "গুমানীগঞ্জ",
                "nameEn": "গুমানীগঞ্জ"
              },
              {
                "name": "কামারদহ",
                "nameEn": "কামারদহ"
              },
              {
                "name": "কোচাশহর",
                "nameEn": "কোচাশহর"
              },
              {
                "name": "শিবপুর",
                "nameEn": "শিবপুর"
              },
              {
                "name": "শালমারা",
                "nameEn": "শালমারা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "পলাশবাড়ী উপজেলা",
            "nameEn": "Palashbari",
            "unions": [
              {
                "name": "কিশোরগাড়ী",
                "nameEn": "কিশোরগাড়ী"
              },
              {
                "name": "হোসেনপুর",
                "nameEn": "হোসেনপুর"
              },
              {
                "name": "পলাশবাড়ী",
                "nameEn": "পলাশবাড়ী"
              },
              {
                "name": "বরিশাল",
                "nameEn": "বরিশাল"
              },
              {
                "name": "মহদীপুর",
                "nameEn": "মহদীপুর"
              },
              {
                "name": "বেতকাপা",
                "nameEn": "বেতকাপা"
              },
              {
                "name": "পবনাপুর",
                "nameEn": "পবনাপুর"
              },
              {
                "name": "মনোহরপুর",
                "nameEn": "মনোহরপুর"
              },
              {
                "name": "হরিনাথপুর",
                "nameEn": "হরিনাথপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "সাদুল্লাপুর উপজেলা",
            "nameEn": "Sadullapur",
            "unions": [
              {
                "name": "রসুলপুর",
                "nameEn": "রসুলপুর"
              },
              {
                "name": "নলডাঙ্গা",
                "nameEn": "নলডাঙ্গা"
              },
              {
                "name": "দামোদরপুর",
                "nameEn": "দামোদরপুর"
              },
              {
                "name": "জামালপুর",
                "nameEn": "জামালপুর"
              },
              {
                "name": "ফরিদপুর",
                "nameEn": "ফরিদপুর"
              },
              {
                "name": "ধাপেরহাট",
                "nameEn": "ধাপেরহাট"
              },
              {
                "name": "ইদিলপুর",
                "nameEn": "ইদিলপুর"
              },
              {
                "name": "ভাতগ্রাম",
                "nameEn": "ভাতগ্রাম"
              },
              {
                "name": "বনগ্রাম",
                "nameEn": "বনগ্রাম"
              },
              {
                "name": "কামারপাড়া",
                "nameEn": "কামারপাড়া"
              },
              {
                "name": "খোর্দ্দকোমরপুর",
                "nameEn": "খোর্দ্দকোমরপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "সাঘাটা উপজেলা",
            "nameEn": "Saghata",
            "unions": [
              {
                "name": "পদুমশহর",
                "nameEn": "পদুমশহর"
              },
              {
                "name": "ভরতখালী",
                "nameEn": "ভরতখালী"
              },
              {
                "name": "সাঘাটা",
                "nameEn": "সাঘাটা"
              },
              {
                "name": "মুক্তিনগর",
                "nameEn": "মুক্তিনগর"
              },
              {
                "name": "কচুয়া",
                "nameEn": "কচুয়া"
              },
              {
                "name": "ঘুড়িদহ",
                "nameEn": "ঘুড়িদহ"
              },
              {
                "name": "হলদিয়া",
                "nameEn": "হলদিয়া"
              },
              {
                "name": "জুমারবাড়ী",
                "nameEn": "জুমারবাড়ী"
              },
              {
                "name": "কামালেরপাড়া",
                "nameEn": "কামালেরপাড়া"
              },
              {
                "name": "বোনারপাড়া",
                "nameEn": "বোনারপাড়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "সুন্দরগঞ্জ উপজেলা",
            "nameEn": "Sundarganj",
            "unions": [
              {
                "name": "বামনডাঙ্গা",
                "nameEn": "বামনডাঙ্গা"
              },
              {
                "name": "সোনারায়",
                "nameEn": "সোনারায়"
              },
              {
                "name": "তারাপুর",
                "nameEn": "তারাপুর"
              },
              {
                "name": "বেলকা",
                "nameEn": "বেলকা"
              },
              {
                "name": "দহবন্দ",
                "nameEn": "দহবন্দ"
              },
              {
                "name": "সর্বানন্দ",
                "nameEn": "সর্বানন্দ"
              },
              {
                "name": "রামজীবন",
                "nameEn": "রামজীবন"
              },
              {
                "name": "ধোপাডাঙ্গা",
                "nameEn": "ধোপাডাঙ্গা"
              },
              {
                "name": "ছাপরহাটী",
                "nameEn": "ছাপরহাটী"
              },
              {
                "name": "শান্তিরাম",
                "nameEn": "শান্তিরাম"
              },
              {
                "name": "কঞ্চিবাড়ী",
                "nameEn": "কঞ্চিবাড়ী"
              },
              {
                "name": "শ্রীপুর",
                "nameEn": "শ্রীপুর"
              },
              {
                "name": "চন্ডিপুর",
                "nameEn": "চন্ডিপুর"
              },
              {
                "name": "কাপাসিয়া",
                "nameEn": "কাপাসিয়া"
              },
              {
                "name": "হরিপুর",
                "nameEn": "হরিপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Fulchhari পৌরসভা",
            "nameEn": "Fulchhari Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Gobindaganj পৌরসভা",
            "nameEn": "Gobindaganj Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Palashbari পৌরসভা",
            "nameEn": "Palashbari Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Sadullapur পৌরসভা",
            "nameEn": "Sadullapur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Saghata পৌরসভা",
            "nameEn": "Saghata Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Sundarganj পৌরসভা",
            "nameEn": "Sundarganj Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "কুড়িগ্রাম",
        "nameEn": "Kurigram",
        "upazilas": [
          {
            "name": "কুড়িগ্রাম পৌরসভা",
            "nameEn": "Kurigram Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "কুড়িগ্রাম সদর উপজেলা",
            "nameEn": "Bhurungamari",
            "unions": [
              {
                "name": "কাঁঠালবাড়ী",
                "nameEn": "কাঁঠালবাড়ী"
              },
              {
                "name": "ঘোগাদহ",
                "nameEn": "ঘোগাদহ"
              },
              {
                "name": "পাঁচগাছি",
                "nameEn": "পাঁচগাছি"
              },
              {
                "name": "বেলগাছা",
                "nameEn": "বেলগাছা"
              },
              {
                "name": "ভোগডাঙ্গা",
                "nameEn": "ভোগডাঙ্গা"
              },
              {
                "name": "মোগলবাছা",
                "nameEn": "মোগলবাছা"
              },
              {
                "name": "যাত্রাপুর",
                "nameEn": "যাত্রাপুর"
              },
              {
                "name": "হোলাখানা",
                "nameEn": "হোলাখানা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "উলিপুর উপজেলা",
            "nameEn": "Chilmari",
            "unions": [
              {
                "name": "দূর্গাপুর ইউনিয়ন",
                "nameEn": "দূর্গাপুর"
              },
              {
                "name": "বেগমগঞ্জ ইউনিয়ন",
                "nameEn": "বেগমগঞ্জ"
              },
              {
                "name": "বুড়াবুড়ি ইউনিয়ন",
                "nameEn": "বুড়াবুড়ি"
              },
              {
                "name": "বজরা ইউনিয়ন",
                "nameEn": "বজরা"
              },
              {
                "name": "দলদলিয়া ইউনিয়ন",
                "nameEn": "দলদলিয়া"
              },
              {
                "name": "ধামশ্রেণী ইউনিয়ন",
                "nameEn": "ধামশ্রেণী"
              },
              {
                "name": "ধড়নিবাড়ি ইউনিয়ন",
                "nameEn": "ধড়নিবাড়ি"
              },
              {
                "name": "গুনাইগাছ ইউনিয়ন",
                "nameEn": "গুনাইগাছ"
              },
              {
                "name": "হাতিয়া ইউনিয়ন",
                "nameEn": "হাতিয়া"
              },
              {
                "name": "পান্ডুল ইউনিয়ন",
                "nameEn": "পান্ডুল"
              },
              {
                "name": "সাহেবের আলগা ইউনিয়ন",
                "nameEn": "সাহেবের আলগা"
              },
              {
                "name": "তবকপুর ইউনিয়ন",
                "nameEn": "তবকপুর"
              },
              {
                "name": "থেতরাই ইউনিয়ন",
                "nameEn": "থেতরাই"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "চর রাজিবপুর",
            "nameEn": "Fulbari",
            "unions": [
              {
                "name": "রাজিবপুর ইউনিয়ন",
                "nameEn": "রাজিবপুর"
              },
              {
                "name": "কোদালকাটি ইউনিয়ন",
                "nameEn": "কোদালকাটি"
              },
              {
                "name": "মোহনগঞ্জ ইউনিয়ন",
                "nameEn": "মোহনগঞ্জ"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "চিলমারী উপজেলা",
            "nameEn": "Kurigram Sadar",
            "unions": [
              {
                "name": "অষ্টমির চর ইউনিয়ন",
                "nameEn": "অষ্টমির চর"
              },
              {
                "name": "নয়ার হাট ইউনিয়ন",
                "nameEn": "নয়ার হাট"
              },
              {
                "name": "চিলমারী ইউনিয়ন",
                "nameEn": "চিলমারী"
              },
              {
                "name": "রমনা ইউনিয়ন",
                "nameEn": "রমনা"
              },
              {
                "name": "থানাহাট ইউনিয়ন",
                "nameEn": "থানাহাট"
              },
              {
                "name": "রাণীগঞ্জ ইউনিয়ন",
                "nameEn": "রাণীগঞ্জ"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "নাগেশ্বরী উপজেলা",
            "nameEn": "Nageswari",
            "unions": [
              {
                "name": "রামখানা ইউনিয়ন",
                "nameEn": "রামখানা"
              },
              {
                "name": "রায়গঞ্জ ইউনিয়ন",
                "nameEn": "রায়গঞ্জ"
              },
              {
                "name": "সন্তোষপুর ইউনিয়ন",
                "nameEn": "সন্তোষপুর"
              },
              {
                "name": "বামনডাঙ্গা ইউনিয়ন",
                "nameEn": "বামনডাঙ্গা"
              },
              {
                "name": "নেওয়াশী ইউনিয়ন",
                "nameEn": "নেওয়াশী"
              },
              {
                "name": "হাসনাবাদ ইউনিয়ন",
                "nameEn": "হাসনাবাদ"
              },
              {
                "name": "ভিতরবন্দ ইউনিয়ন",
                "nameEn": "ভিতরবন্দ"
              },
              {
                "name": "নুনখাওয়া ইউনিয়ন",
                "nameEn": "নুনখাওয়া"
              },
              {
                "name": "কালীগঞ্জ ইউনিয়ন",
                "nameEn": "কালীগঞ্জ"
              },
              {
                "name": "বেরুবাড়ী ইউনিয়ন",
                "nameEn": "বেরুবাড়ী"
              },
              {
                "name": "কেদার ইউনিয়ন",
                "nameEn": "কেদার"
              },
              {
                "name": "কচাকাটা ইউনিয়ন",
                "nameEn": "কচাকাটা"
              },
              {
                "name": "বল্লভেরখাস ইউনিয়ন",
                "nameEn": "বল্লভেরখাস"
              },
              {
                "name": "নারায়ণপুর ইউনিয়ন",
                "nameEn": "নারায়ণপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ফুলবাড়ী উপজেলা",
            "nameEn": "Rajarhat",
            "unions": [
              {
                "name": "কাশীপুর ইউনিয়ন",
                "nameEn": "কাশীপুর"
              },
              {
                "name": "নাওডাঙ্গা ইউনিয়ন",
                "nameEn": "নাওডাঙ্গা"
              },
              {
                "name": "ফুলবাড়ী ইউনিয়ন",
                "nameEn": "ফুলবাড়ী"
              },
              {
                "name": "বড়ভিটা ইউনিয়ন",
                "nameEn": "বড়ভিটা"
              },
              {
                "name": "ভাঙ্গামোড় ইউনিয়ন",
                "nameEn": "ভাঙ্গামোড়"
              },
              {
                "name": "শিমুলবাড়ী ইউনিয়ন",
                "nameEn": "শিমুলবাড়ী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ভুরুঙ্গামারী উপজেলা",
            "nameEn": "Rajibpur",
            "unions": [
              {
                "name": "পাথরডুবী ইউনিয়ন",
                "nameEn": "পাথরডুবী"
              },
              {
                "name": "শিলখুড়ি ইউনিয়ন",
                "nameEn": "শিলখুড়ি"
              },
              {
                "name": "তিলাই ইউনিয়ন",
                "nameEn": "তিলাই"
              },
              {
                "name": "পাইকেরছড়া ইউনিয়ন",
                "nameEn": "পাইকেরছড়া"
              },
              {
                "name": "ভূরুঙ্গামারী ইউনিয়ন",
                "nameEn": "ভূরুঙ্গামারী"
              },
              {
                "name": "জয়মনিরহাট ইউনিয়ন",
                "nameEn": "জয়মনিরহাট"
              },
              {
                "name": "আন্ধারীঝাড় ইউনিয়ন",
                "nameEn": "আন্ধারীঝাড়"
              },
              {
                "name": "বলদিয়া ইউনিয়ন",
                "nameEn": "বলদিয়া"
              },
              {
                "name": "চরভূরুঙ্গামারী ইউনিয়ন",
                "nameEn": "চরভূরুঙ্গামারী"
              },
              {
                "name": "বঙ্গসোনাহাট ইউনিয়ন",
                "nameEn": "বঙ্গসোনাহাট"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "রাজারহাট উপজেলা",
            "nameEn": "Rowmari",
            "unions": [
              {
                "name": "ঘড়িয়ালডাঙ্গা ইউনিয়ন",
                "nameEn": "ঘড়িয়ালডাঙ্গা"
              },
              {
                "name": "ছিনাই ইউনিয়ন",
                "nameEn": "ছিনাই"
              },
              {
                "name": "রাজারহাট ইউনিয়ন",
                "nameEn": "রাজারহাট"
              },
              {
                "name": "চাকিরপশার ইউনিয়ন",
                "nameEn": "চাকিরপশার"
              },
              {
                "name": "বিদ্যানন্দ ইউনিয়ন",
                "nameEn": "বিদ্যানন্দ"
              },
              {
                "name": "উমরমজিদ ইউনিয়ন",
                "nameEn": "উমরমজিদ"
              },
              {
                "name": "নজিমখাঁন ইউনিয়ন",
                "nameEn": "নজিমখাঁন"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "রৌমারী উপজেলা",
            "nameEn": "Ulipur",
            "unions": [
              {
                "name": "রৌমারী ইউনিয়ন",
                "nameEn": "রৌমারী"
              },
              {
                "name": "যাদুর চর ইউনিয়ন",
                "nameEn": "যাদুর চর"
              },
              {
                "name": "শৌলমারী ইউনিয়ন",
                "nameEn": "শৌলমারী"
              },
              {
                "name": "দাতভাঙ্গা ইউনিয়ন",
                "nameEn": "দাতভাঙ্গা"
              },
              {
                "name": "বন্দবেড় ইউনিয়ন",
                "nameEn": "বন্দবেড়"
              },
              {
                "name": "চর শৌলমারী ইউনিয়ন",
                "nameEn": "চর শৌলমারী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Bhurungamari পৌরসভা",
            "nameEn": "Bhurungamari Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Char Rajibpur পৌরসভা",
            "nameEn": "Char Rajibpur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Chilmari পৌরসভা",
            "nameEn": "Chilmari Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Nageshwari পৌরসভা",
            "nameEn": "Nageshwari Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Phulbari পৌরসভা",
            "nameEn": "Phulbari Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Rajarhat পৌরসভা",
            "nameEn": "Rajarhat Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Raumari পৌরসভা",
            "nameEn": "Raumari Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Ulipur পৌরসভা",
            "nameEn": "Ulipur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "লালমনিরহাট",
        "nameEn": "Lalmonirhat",
        "upazilas": [
          {
            "name": "লালমনিরহাট পৌরসভা",
            "nameEn": "Lalmonirhat Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "লালমনিরহাট সদর উপজেলা",
            "nameEn": "Aditmari",
            "unions": [
              {
                "name": "মোগলহাট",
                "nameEn": "মোগলহাট"
              },
              {
                "name": "কুলাঘাট",
                "nameEn": "কুলাঘাট"
              },
              {
                "name": "মহেন্দ্রনগর",
                "nameEn": "মহেন্দ্রনগর"
              },
              {
                "name": "হারাটী",
                "nameEn": "হারাটী"
              },
              {
                "name": "খুনিয়াগাছ",
                "nameEn": "খুনিয়াগাছ"
              },
              {
                "name": "রাজপুর",
                "nameEn": "রাজপুর"
              },
              {
                "name": "গোকুন্ডা",
                "nameEn": "গোকুন্ডা"
              },
              {
                "name": "পঞ্চগ্রাম",
                "nameEn": "পঞ্চগ্রাম"
              },
              {
                "name": "বড়বাড়ি",
                "nameEn": "বড়বাড়ি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "আদিতমারী উপজেলা",
            "nameEn": "Hatibandha",
            "unions": [
              {
                "name": "কমলাবাড়ী",
                "nameEn": "কমলাবাড়ী"
              },
              {
                "name": "দুর্গাপুর",
                "nameEn": "দুর্গাপুর"
              },
              {
                "name": "পলাশী",
                "nameEn": "পলাশী"
              },
              {
                "name": "ভাদাই",
                "nameEn": "ভাদাই"
              },
              {
                "name": "ভেলাবাড়ী",
                "nameEn": "ভেলাবাড়ী"
              },
              {
                "name": "মহিষখোচা",
                "nameEn": "মহিষখোচা"
              },
              {
                "name": "সাপটিবাড়ী",
                "nameEn": "সাপটিবাড়ী"
              },
              {
                "name": "শরপুকুর",
                "nameEn": "শরপুকুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কালীগঞ্জ উপজেলা",
            "nameEn": "Kaliganj",
            "unions": [
              {
                "name": "কাকিনা",
                "nameEn": "কাকিনা"
              },
              {
                "name": "গোড়ল",
                "nameEn": "গোড়ল"
              },
              {
                "name": "চন্দ্রপুর",
                "nameEn": "চন্দ্রপুর"
              },
              {
                "name": "চলবলা",
                "nameEn": "চলবলা"
              },
              {
                "name": "তুষভান্ডার",
                "nameEn": "তুষভান্ডার"
              },
              {
                "name": "দলগ্রাম",
                "nameEn": "দলগ্রাম"
              },
              {
                "name": "ভোটমারী",
                "nameEn": "ভোটমারী"
              },
              {
                "name": "মদাতি",
                "nameEn": "মদাতি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "পাটগ্রাম উপজেলা",
            "nameEn": "Lalmonirhat Sadar",
            "unions": [
              {
                "name": "শ্রীরামপুর",
                "nameEn": "শ্রীরামপুর"
              },
              {
                "name": "জগতবেড়",
                "nameEn": "জগতবেড়"
              },
              {
                "name": "পাটগ্রাম",
                "nameEn": "পাটগ্রাম"
              },
              {
                "name": "বাউরা",
                "nameEn": "বাউরা"
              },
              {
                "name": "কুচলীবাড়ী",
                "nameEn": "কুচলীবাড়ী"
              },
              {
                "name": "জোংড়া",
                "nameEn": "জোংড়া"
              },
              {
                "name": "দহগ্রাম",
                "nameEn": "দহগ্রাম"
              },
              {
                "name": "বুড়িমারী",
                "nameEn": "বুড়িমারী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "হাতীবান্ধা উপজেলা",
            "nameEn": "Patgram",
            "unions": [
              {
                "name": "বড়খাতা",
                "nameEn": "বড়খাতা"
              },
              {
                "name": "গড্ডিমারী",
                "nameEn": "গড্ডিমারী"
              },
              {
                "name": "সিংগীমারী",
                "nameEn": "সিংগীমারী"
              },
              {
                "name": "টংভাঙ্গা",
                "nameEn": "টংভাঙ্গা"
              },
              {
                "name": "সিন্দুর্ণা",
                "nameEn": "সিন্দুর্ণা"
              },
              {
                "name": "পাটিকাপাড়া",
                "nameEn": "পাটিকাপাড়া"
              },
              {
                "name": "ডাউয়াবাড়ী",
                "nameEn": "ডাউয়াবাড়ী"
              },
              {
                "name": "নওদাবাস",
                "nameEn": "নওদাবাস"
              },
              {
                "name": "গোতামারী",
                "nameEn": "গোতামারী"
              },
              {
                "name": "ভেলাগুড়ি",
                "nameEn": "ভেলাগুড়ি"
              },
              {
                "name": "সানিয়াজানও",
                "nameEn": "সানিয়াজানও"
              },
              {
                "name": "ফকিরপাড়া",
                "nameEn": "ফকিরপাড়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Aditmari পৌরসভা",
            "nameEn": "Aditmari Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Hatibandha পৌরসভা",
            "nameEn": "Hatibandha Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Kaliganj পৌরসভা",
            "nameEn": "Kaliganj Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Patgram পৌরসভা",
            "nameEn": "Patgram Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "নীলফামারী",
        "nameEn": "Nilphamari",
        "upazilas": [
          {
            "name": "নীলফামারী পৌরসভা",
            "nameEn": "Nilphamari Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "নীলফামারী সদর উপজেলা",
            "nameEn": "Dimla",
            "unions": [
              {
                "name": "চওড়া বড়গাছা",
                "nameEn": "চওড়া বড়গাছা"
              },
              {
                "name": "গোড়গাম",
                "nameEn": "গোড়গাম"
              },
              {
                "name": "খোকশাবাড়ী",
                "nameEn": "খোকশাবাড়ী"
              },
              {
                "name": "পলাশবাড়ী",
                "nameEn": "পলাশবাড়ী"
              },
              {
                "name": "রামনগর",
                "nameEn": "রামনগর"
              },
              {
                "name": "কচুকাটা",
                "nameEn": "কচুকাটা"
              },
              {
                "name": "পঞ্চপুকুর",
                "nameEn": "পঞ্চপুকুর"
              },
              {
                "name": "ইটাখোলা",
                "nameEn": "ইটাখোলা"
              },
              {
                "name": "কুন্দুপুকুর",
                "nameEn": "কুন্দুপুকুর"
              },
              {
                "name": "সোনারায়",
                "nameEn": "সোনারায়"
              },
              {
                "name": "সংগলশী",
                "nameEn": "সংগলশী"
              },
              {
                "name": "চড়াইখোলা",
                "nameEn": "চড়াইখোলা"
              },
              {
                "name": "চাপড়া সরমজানী",
                "nameEn": "চাপড়া সরমজানী"
              },
              {
                "name": "টুপামারী",
                "nameEn": "টুপামারী"
              },
              {
                "name": "লক্ষীচাপ",
                "nameEn": "লক্ষীচাপ"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ডোমার উপজেলা",
            "nameEn": "Domar",
            "unions": [
              {
                "name": "ডোমার সদর",
                "nameEn": "ডোমার সদর"
              },
              {
                "name": "বোড়াগাড়ী",
                "nameEn": "বোড়াগাড়ী"
              },
              {
                "name": "জোড়াবাড়ী",
                "nameEn": "জোড়াবাড়ী"
              },
              {
                "name": "বামুনিয়া",
                "nameEn": "বামুনিয়া"
              },
              {
                "name": "পাংগা মটকপুর",
                "nameEn": "পাংগা মটকপুর"
              },
              {
                "name": "সোনারায়",
                "nameEn": "সোনারায়"
              },
              {
                "name": "হরিণচড়া",
                "nameEn": "হরিণচড়া"
              },
              {
                "name": "ভোগডাবুড়ী",
                "nameEn": "ভোগডাবুড়ী"
              },
              {
                "name": "কেতকীবাড়ী",
                "nameEn": "কেতকীবাড়ী"
              },
              {
                "name": "গোমনাতি",
                "nameEn": "গোমনাতি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ডিমলা উপজেলা",
            "nameEn": "Jaldhaka",
            "unions": [
              {
                "name": "পশ্চিম ছাতনাই",
                "nameEn": "পশ্চিম ছাতনাই"
              },
              {
                "name": "বালাপাড়া",
                "nameEn": "বালাপাড়া"
              },
              {
                "name": "ডিমলা",
                "nameEn": "ডিমলা"
              },
              {
                "name": "খগাখড়িবাড়ী",
                "nameEn": "খগাখড়িবাড়ী"
              },
              {
                "name": "গয়াবাড়ী",
                "nameEn": "গয়াবাড়ী"
              },
              {
                "name": "নাউতারা",
                "nameEn": "নাউতারা"
              },
              {
                "name": "খালিশা চাপানী",
                "nameEn": "খালিশা চাপানী"
              },
              {
                "name": "ঝুনাগাছ চাপানী",
                "nameEn": "ঝুনাগাছ চাপানী"
              },
              {
                "name": "টেপাখড়িবাড়ী",
                "nameEn": "টেপাখড়িবাড়ী"
              },
              {
                "name": "পূর্ব ছাতনাই",
                "nameEn": "পূর্ব ছাতনাই"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "জলঢাকা উপজেলা",
            "nameEn": "Kishoreganj",
            "unions": [
              {
                "name": "গোলমুন্ডা",
                "nameEn": "গোলমুন্ডা"
              },
              {
                "name": "মীরগঞ্জ",
                "nameEn": "মীরগঞ্জ"
              },
              {
                "name": "ডাউয়াবাড়ী",
                "nameEn": "ডাউয়াবাড়ী"
              },
              {
                "name": "বালাগ্রাম",
                "nameEn": "বালাগ্রাম"
              },
              {
                "name": "গোলনা",
                "nameEn": "গোলনা"
              },
              {
                "name": "ধর্মপাল",
                "nameEn": "ধর্মপাল"
              },
              {
                "name": "শিমুলবাড়ী",
                "nameEn": "শিমুলবাড়ী"
              },
              {
                "name": "কাঁঠালী",
                "nameEn": "কাঁঠালী"
              },
              {
                "name": "খুটামারা",
                "nameEn": "খুটামারা"
              },
              {
                "name": "শৌলমারী",
                "nameEn": "শৌলমারী"
              },
              {
                "name": "কৈমারী",
                "nameEn": "কৈমারী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কিশোরগঞ্জ উপজেলা",
            "nameEn": "Nilphamari Sadar",
            "unions": [
              {
                "name": "কিশোরগঞ্জ",
                "nameEn": "কিশোরগঞ্জ"
              },
              {
                "name": "বড়ভিটা",
                "nameEn": "বড়ভিটা"
              },
              {
                "name": "বাহাগিলি",
                "nameEn": "বাহাগিলি"
              },
              {
                "name": "পুঁটিমারী",
                "nameEn": "পুঁটিমারী"
              },
              {
                "name": "নিতাই",
                "nameEn": "নিতাই"
              },
              {
                "name": "চাঁদখানা",
                "nameEn": "চাঁদখানা"
              },
              {
                "name": "রনচন্ডী",
                "nameEn": "রনচন্ডী"
              },
              {
                "name": "গরগ্রাম",
                "nameEn": "গরগ্রাম"
              },
              {
                "name": "মাগুরা",
                "nameEn": "মাগুরা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "সৈয়দপুর উপজেলা",
            "nameEn": "Sayedpur",
            "unions": [
              {
                "name": "কামারপুকুর",
                "nameEn": "কামারপুকুর"
              },
              {
                "name": "কাশিরাম বেলপুকুর",
                "nameEn": "কাশিরাম বেলপুকুর"
              },
              {
                "name": "বাঙ্গালীপুর",
                "nameEn": "বাঙ্গালীপুর"
              },
              {
                "name": "বোতলাগাড়ী",
                "nameEn": "বোতলাগাড়ী"
              },
              {
                "name": "খাতামধুপুর",
                "nameEn": "খাতামধুপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Dimla পৌরসভা",
            "nameEn": "Dimla Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Domar পৌরসভা",
            "nameEn": "Domar Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Jaldhaka পৌরসভা",
            "nameEn": "Jaldhaka Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Kishoreganj পৌরসভা",
            "nameEn": "Kishoreganj Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Saidpur পৌরসভা",
            "nameEn": "Saidpur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "পঞ্চগড়",
        "nameEn": "Panchagarh",
        "upazilas": [
          {
            "name": "পঞ্চগড় পৌরসভা",
            "nameEn": "Panchagarh Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "পঞ্চগড় সদর উপজেলা",
            "nameEn": "Atwari",
            "unions": [
              {
                "name": "অমরখানা",
                "nameEn": "অমরখানা"
              },
              {
                "name": "হাফিজাবাদ",
                "nameEn": "হাফিজাবাদ"
              },
              {
                "name": "পঞ্চগড় সদর",
                "nameEn": "পঞ্চগড় সদর"
              },
              {
                "name": "কামাত কাজলদিঘী",
                "nameEn": "কামাত কাজলদিঘী"
              },
              {
                "name": "চাকলাহাট",
                "nameEn": "চাকলাহাট"
              },
              {
                "name": "সাতমেরা",
                "nameEn": "সাতমেরা"
              },
              {
                "name": "হাড়িভাসা",
                "nameEn": "হাড়িভাসা"
              },
              {
                "name": "ধাক্কামারা",
                "nameEn": "ধাক্কামারা"
              },
              {
                "name": "মাগুরা",
                "nameEn": "মাগুরা"
              },
              {
                "name": "গরিনাবাড়ী",
                "nameEn": "গরিনাবাড়ী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "দেবীগঞ্জ উপজেলা",
            "nameEn": "Boda",
            "unions": [
              {
                "name": "চিলাহাটি",
                "nameEn": "চিলাহাটি"
              },
              {
                "name": "শালডাঙ্গা",
                "nameEn": "শালডাঙ্গা"
              },
              {
                "name": "দেবীগঞ্জ",
                "nameEn": "দেবীগঞ্জ"
              },
              {
                "name": "পামুলী",
                "nameEn": "পামুলী"
              },
              {
                "name": "সুন্দরদিঘী",
                "nameEn": "সুন্দরদিঘী"
              },
              {
                "name": "সোনাহার",
                "nameEn": "সোনাহার"
              },
              {
                "name": "টেপ্রীগঞ্জ",
                "nameEn": "টেপ্রীগঞ্জ"
              },
              {
                "name": "দন্ডপাল",
                "nameEn": "দন্ডপাল"
              },
              {
                "name": "দেবীডুবা",
                "nameEn": "দেবীডুবা"
              },
              {
                "name": "চেংঠী হাজরাডাঙ্গা",
                "nameEn": "চেংঠী হাজরাডাঙ্গা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "তেতুলিয়া উপজেলা",
            "nameEn": "Debiganj",
            "unions": [
              {
                "name": "বাংলাবান্ধা",
                "nameEn": "বাংলাবান্ধা"
              },
              {
                "name": "তিরনইহাট",
                "nameEn": "তিরনইহাট"
              },
              {
                "name": "তেতুলিয়া",
                "nameEn": "তেতুলিয়া"
              },
              {
                "name": "শালবাহান",
                "nameEn": "শালবাহান"
              },
              {
                "name": "বুড়াবুড়ি",
                "nameEn": "বুড়াবুড়ি"
              },
              {
                "name": "ভজনপুর",
                "nameEn": "ভজনপুর"
              },
              {
                "name": "দেবনগর",
                "nameEn": "দেবনগর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "আটোয়ারী উপজেলা",
            "nameEn": "Panchagarh Sadar",
            "unions": [
              {
                "name": "মিরজাপুর",
                "nameEn": "মিরজাপুর"
              },
              {
                "name": "তোড়িয়া",
                "nameEn": "তোড়িয়া"
              },
              {
                "name": "আলোয়াখোয়া",
                "nameEn": "আলোয়াখোয়া"
              },
              {
                "name": "রাধানগর",
                "nameEn": "রাধানগর"
              },
              {
                "name": "বলরামপুর",
                "nameEn": "বলরামপুর"
              },
              {
                "name": "ধামোর",
                "nameEn": "ধামোর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বোদা উপজেলা",
            "nameEn": "Tetulia",
            "unions": [
              {
                "name": "ঝলইশালশিরি",
                "nameEn": "ঝলইশালশিরি"
              },
              {
                "name": "ময়দানদিঘি",
                "nameEn": "ময়দানদিঘি"
              },
              {
                "name": "বেংহারি",
                "nameEn": "বেংহারি"
              },
              {
                "name": "কাজলদিঘী কালিয়াগঞ্জ",
                "nameEn": "কাজলদিঘী কালিয়াগঞ্জ"
              },
              {
                "name": "বড়শশী",
                "nameEn": "বড়শশী"
              },
              {
                "name": "মাড়েয়া",
                "nameEn": "মাড়েয়া"
              },
              {
                "name": "চন্দনবাড়ী",
                "nameEn": "চন্দনবাড়ী"
              },
              {
                "name": "বোদা",
                "nameEn": "বোদা"
              },
              {
                "name": "সাকোয়া",
                "nameEn": "সাকোয়া"
              },
              {
                "name": "পাঁচপীর",
                "nameEn": "পাঁচপীর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Atwari পৌরসভা",
            "nameEn": "Atwari Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Boda পৌরসভা",
            "nameEn": "Boda Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Debiganj পৌরসভা",
            "nameEn": "Debiganj Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Tetulia পৌরসভা",
            "nameEn": "Tetulia Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "রংপুর",
        "nameEn": "Rangpur",
        "upazilas": [
          {
            "name": "রংপুর সিটি কর্পোরেশন",
            "nameEn": "Rangpur City Corporation",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              },
              {
                "name": "ওয়ার্ড নং-10",
                "nameEn": "Ward No-10"
              },
              {
                "name": "ওয়ার্ড নং-11",
                "nameEn": "Ward No-11"
              },
              {
                "name": "ওয়ার্ড নং-12",
                "nameEn": "Ward No-12"
              },
              {
                "name": "ওয়ার্ড নং-13",
                "nameEn": "Ward No-13"
              },
              {
                "name": "ওয়ার্ড নং-14",
                "nameEn": "Ward No-14"
              },
              {
                "name": "ওয়ার্ড নং-15",
                "nameEn": "Ward No-15"
              },
              {
                "name": "ওয়ার্ড নং-16",
                "nameEn": "Ward No-16"
              },
              {
                "name": "ওয়ার্ড নং-17",
                "nameEn": "Ward No-17"
              },
              {
                "name": "ওয়ার্ড নং-18",
                "nameEn": "Ward No-18"
              },
              {
                "name": "ওয়ার্ড নং-19",
                "nameEn": "Ward No-19"
              },
              {
                "name": "ওয়ার্ড নং-20",
                "nameEn": "Ward No-20"
              },
              {
                "name": "ওয়ার্ড নং-21",
                "nameEn": "Ward No-21"
              },
              {
                "name": "ওয়ার্ড নং-22",
                "nameEn": "Ward No-22"
              },
              {
                "name": "ওয়ার্ড নং-23",
                "nameEn": "Ward No-23"
              },
              {
                "name": "ওয়ার্ড নং-24",
                "nameEn": "Ward No-24"
              },
              {
                "name": "ওয়ার্ড নং-25",
                "nameEn": "Ward No-25"
              },
              {
                "name": "ওয়ার্ড নং-26",
                "nameEn": "Ward No-26"
              },
              {
                "name": "ওয়ার্ড নং-27",
                "nameEn": "Ward No-27"
              },
              {
                "name": "ওয়ার্ড নং-28",
                "nameEn": "Ward No-28"
              },
              {
                "name": "ওয়ার্ড নং-29",
                "nameEn": "Ward No-29"
              },
              {
                "name": "ওয়ার্ড নং-30",
                "nameEn": "Ward No-30"
              },
              {
                "name": "ওয়ার্ড নং-31",
                "nameEn": "Ward No-31"
              },
              {
                "name": "ওয়ার্ড নং-32",
                "nameEn": "Ward No-32"
              },
              {
                "name": "ওয়ার্ড নং-33",
                "nameEn": "Ward No-33"
              }
            ],
            "type": "city_corporation"
          },
          {
            "name": "রংপুর সদর উপজেলা",
            "nameEn": "Badarganj",
            "unions": [
              {
                "name": "মমিনপুর",
                "nameEn": "মমিনপুর"
              },
              {
                "name": "হরিদেবপুর",
                "nameEn": "হরিদেবপুর"
              },
              {
                "name": "চন্দনপাট",
                "nameEn": "চন্দনপাট"
              },
              {
                "name": "সদ্যপুস্করনী",
                "nameEn": "সদ্যপুস্করনী"
              },
              {
                "name": "খলেয়া",
                "nameEn": "খলেয়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বদরগঞ্জ উপজেলা",
            "nameEn": "Gangachara",
            "unions": [
              {
                "name": "কুতুবপুর",
                "nameEn": "কুতুবপুর"
              },
              {
                "name": "গোপালপুর",
                "nameEn": "গোপালপুর"
              },
              {
                "name": "গোপীনাথপুর",
                "nameEn": "গোপীনাথপুর"
              },
              {
                "name": "দামোদরপুর",
                "nameEn": "দামোদরপুর"
              },
              {
                "name": "বদরগঞ্জ",
                "nameEn": "বদরগঞ্জ"
              },
              {
                "name": "বিষ্ণুপুর",
                "nameEn": "বিষ্ণুপুর"
              },
              {
                "name": "মধুপুর",
                "nameEn": "মধুপুর"
              },
              {
                "name": "রাধানগর",
                "nameEn": "রাধানগর"
              },
              {
                "name": "রামনাথপুর",
                "nameEn": "রামনাথপুর"
              },
              {
                "name": "লোহানীপাড়া",
                "nameEn": "লোহানীপাড়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "গংগাচড়া উপজেলা",
            "nameEn": "Kaunia",
            "unions": [
              {
                "name": "বেতগাড়ী",
                "nameEn": "বেতগাড়ী"
              },
              {
                "name": "খলেয়া",
                "nameEn": "খলেয়া"
              },
              {
                "name": "বড়বিল",
                "nameEn": "বড়বিল"
              },
              {
                "name": "কোলকোন্দ",
                "nameEn": "কোলকোন্দ"
              },
              {
                "name": "লক্ষীটারী",
                "nameEn": "লক্ষীটারী"
              },
              {
                "name": "গংগাচড়া",
                "nameEn": "গংগাচড়া"
              },
              {
                "name": "গজঘন্টা",
                "nameEn": "গজঘন্টা"
              },
              {
                "name": "মর্নেয়া",
                "nameEn": "মর্নেয়া"
              },
              {
                "name": "আলমবিদিতর",
                "nameEn": "আলমবিদিতর"
              },
              {
                "name": "নোহালী",
                "nameEn": "নোহালী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কাউনিয়া উপজেলা",
            "nameEn": "Mithapukur",
            "unions": [
              {
                "name": "সারাই",
                "nameEn": "সারাই"
              },
              {
                "name": "হারাগাছ",
                "nameEn": "হারাগাছ"
              },
              {
                "name": "কুর্শা",
                "nameEn": "কুর্শা"
              },
              {
                "name": "শহীদবাগ",
                "nameEn": "শহীদবাগ"
              },
              {
                "name": "বালাপারা",
                "nameEn": "বালাপারা"
              },
              {
                "name": "টেপামধুপুর",
                "nameEn": "টেপামধুপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মিঠাপুকুর উপজেলা",
            "nameEn": "Pirgacha",
            "unions": [
              {
                "name": "ইমাদপুর",
                "nameEn": "ইমাদপুর"
              },
              {
                "name": "কাফ্রিখাল",
                "nameEn": "কাফ্রিখাল"
              },
              {
                "name": "খোড়াগাছ",
                "nameEn": "খোড়াগাছ"
              },
              {
                "name": "গোপালপুর",
                "nameEn": "গোপালপুর"
              },
              {
                "name": "চেংমারী",
                "nameEn": "চেংমারী"
              },
              {
                "name": "দুর্গাপুর",
                "nameEn": "দুর্গাপুর"
              },
              {
                "name": "পায়রাবন্দ",
                "nameEn": "পায়রাবন্দ"
              },
              {
                "name": "বড় হযরতপুর",
                "nameEn": "বড় হযরতপুর"
              },
              {
                "name": "বড়বালা",
                "nameEn": "বড়বালা"
              },
              {
                "name": "বালারহাট",
                "nameEn": "বালারহাট"
              },
              {
                "name": "বালুয়া মাসিমপুর",
                "nameEn": "বালুয়া মাসিমপুর"
              },
              {
                "name": "ভাঙ্গনী",
                "nameEn": "ভাঙ্গনী"
              },
              {
                "name": "ময়েনপুর",
                "nameEn": "ময়েনপুর"
              },
              {
                "name": "মিলনপুর",
                "nameEn": "মিলনপুর"
              },
              {
                "name": "মিরজাপুর",
                "nameEn": "মিরজাপুর"
              },
              {
                "name": "রাণীপুকুর",
                "nameEn": "রাণীপুকুর"
              },
              {
                "name": "লতিফপুর",
                "nameEn": "লতিফপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "পীরগাছা উপজেলা",
            "nameEn": "Pirganj",
            "unions": [
              {
                "name": "কল্যাণী",
                "nameEn": "কল্যাণী"
              },
              {
                "name": "পারুল",
                "nameEn": "পারুল"
              },
              {
                "name": "ইটাকুমারী",
                "nameEn": "ইটাকুমারী"
              },
              {
                "name": "অন্নাদানগর",
                "nameEn": "অন্নাদানগর"
              },
              {
                "name": "ছাওলা",
                "nameEn": "ছাওলা"
              },
              {
                "name": "তাম্বুলপুর",
                "nameEn": "তাম্বুলপুর"
              },
              {
                "name": "পীরগাছা",
                "nameEn": "পীরগাছা"
              },
              {
                "name": "কৈকুড়ি",
                "nameEn": "কৈকুড়ি"
              },
              {
                "name": "কান্দি ইউনিয়ন",
                "nameEn": "কান্দি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "পীরগাছা উপজেলা",
            "nameEn": "Rangpur Sadar",
            "unions": [
              {
                "name": "চৈত্রকোল ইউনিয়ন",
                "nameEn": "চৈত্রকোল"
              },
              {
                "name": "ভেন্ডাবাড়ী ইউনিয়ন",
                "nameEn": "ভেন্ডাবাড়ী"
              },
              {
                "name": "বড়দরগাহ্ ইউনিয়ন",
                "nameEn": "বড়দরগাহ্"
              },
              {
                "name": "কুমেদপুর ইউনিয়ন",
                "nameEn": "কুমেদপুর"
              },
              {
                "name": "মদনখালী ইউনিয়ন",
                "nameEn": "মদনখালী"
              },
              {
                "name": "টুকুরিয়া ইউনিয়ন",
                "nameEn": "টুকুরিয়া"
              },
              {
                "name": "বড়আলমপুর ইউনিয়ন",
                "nameEn": "বড়আলমপুর"
              },
              {
                "name": "রায়পুর ইউনিয়ন",
                "nameEn": "রায়পুর"
              },
              {
                "name": "পীরগঞ্জ ইউনিয়ন",
                "nameEn": "পীরগঞ্জ"
              },
              {
                "name": "শানেরহাট ইউনিয়ন",
                "nameEn": "শানেরহাট"
              },
              {
                "name": "পাঁচগাছী ইউনিয়ন",
                "nameEn": "পাঁচগাছী"
              },
              {
                "name": "মিঠিপুর ইউনিয়ন",
                "nameEn": "মিঠিপুর"
              },
              {
                "name": "রামনাথপুর ইউনিয়ন",
                "nameEn": "রামনাথপুর"
              },
              {
                "name": "চতরা ইউনিয়ন",
                "nameEn": "চতরা"
              },
              {
                "name": "কাবিলপুর ইউনিয়ন",
                "nameEn": "কাবিলপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "তারাগঞ্জ উপজেলা",
            "nameEn": "Taraganj",
            "unions": [
              {
                "name": "আলমপুর",
                "nameEn": "আলমপুর"
              },
              {
                "name": "কুর্শা",
                "nameEn": "কুর্শা"
              },
              {
                "name": "ইকরচালী",
                "nameEn": "ইকরচালী"
              },
              {
                "name": "হাড়িয়ারকুঠি",
                "nameEn": "হাড়িয়ারকুঠি"
              },
              {
                "name": "সয়ার",
                "nameEn": "সয়ার"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Badarganj পৌরসভা",
            "nameEn": "Badarganj Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Gangachara পৌরসভা",
            "nameEn": "Gangachara Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Kaunia পৌরসভা",
            "nameEn": "Kaunia Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Mithapukur পৌরসভা",
            "nameEn": "Mithapukur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Pirgachha পৌরসভা",
            "nameEn": "Pirgachha Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Pirganj পৌরসভা",
            "nameEn": "Pirganj Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Taraganj পৌরসভা",
            "nameEn": "Taraganj Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "ঠাকুরগাঁও",
        "nameEn": "Thakurgaon",
        "upazilas": [
          {
            "name": "ঠাকুরগাঁও পৌরসভা",
            "nameEn": "Thakurgaon Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "ঠাকুরগাঁও সদর উপজেলা",
            "nameEn": "Baliadangi",
            "unions": [
              {
                "name": "রুহিয়া",
                "nameEn": "রুহিয়া"
              },
              {
                "name": "আখানগর",
                "nameEn": "আখানগর"
              },
              {
                "name": "আকচ",
                "nameEn": "আকচ"
              },
              {
                "name": "বড়গাঁও",
                "nameEn": "বড়গাঁও"
              },
              {
                "name": "বালিয়া",
                "nameEn": "বালিয়া"
              },
              {
                "name": "আউলিয়াপুর",
                "nameEn": "আউলিয়াপুর"
              },
              {
                "name": "চিলারং",
                "nameEn": "চিলারং"
              },
              {
                "name": "রহিমানপুর",
                "nameEn": "রহিমানপুর"
              },
              {
                "name": "রায়পুর",
                "nameEn": "রায়পুর"
              },
              {
                "name": "জামালপুর",
                "nameEn": "জামালপুর"
              },
              {
                "name": "মোহম্মাদপুর",
                "nameEn": "মোহম্মাদপুর"
              },
              {
                "name": "সালন্দর",
                "nameEn": "সালন্দর"
              },
              {
                "name": "গড়েয়া",
                "nameEn": "গড়েয়া"
              },
              {
                "name": "রাজাগাঁও",
                "nameEn": "রাজাগাঁও"
              },
              {
                "name": "দেবীপুর",
                "nameEn": "দেবীপুর"
              },
              {
                "name": "নারগুন",
                "nameEn": "নারগুন"
              },
              {
                "name": "জগন্নাথপুর",
                "nameEn": "জগন্নাথপুর"
              },
              {
                "name": "শুখানপুকুরী",
                "nameEn": "শুখানপুকুরী"
              },
              {
                "name": "বেগুনবাড়ি",
                "nameEn": "বেগুনবাড়ি"
              },
              {
                "name": "রুহিয়া পশ্চিম",
                "nameEn": "রুহিয়া পশ্চিম"
              },
              {
                "name": "ঢোলার হাট",
                "nameEn": "ঢোলার হাট"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "পীরগঞ্জ উপজেলা",
            "nameEn": "Haripur",
            "unions": [
              {
                "name": "ভোমরাদহ",
                "nameEn": "ভোমরাদহ"
              },
              {
                "name": "কোষারাণীগঞ্জ",
                "nameEn": "কোষারাণীগঞ্জ"
              },
              {
                "name": "খনগাঁও",
                "nameEn": "খনগাঁও"
              },
              {
                "name": "সৈয়দপুর",
                "nameEn": "সৈয়দপুর"
              },
              {
                "name": "পীরগঞ্জ",
                "nameEn": "পীরগঞ্জ"
              },
              {
                "name": "হাজীপুর",
                "nameEn": "হাজীপুর"
              },
              {
                "name": "দৌলতপুর",
                "nameEn": "দৌলতপুর"
              },
              {
                "name": "সেনগাাঁও",
                "nameEn": "সেনগাাঁও"
              },
              {
                "name": "জাবরহাট",
                "nameEn": "জাবরহাট"
              },
              {
                "name": "বৈরচুনা",
                "nameEn": "বৈরচুনা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বালিয়াডাঙ্গী উপজেলা",
            "nameEn": "Pirganj",
            "unions": [
              {
                "name": "পাড়িয়া ইউনিয়ন",
                "nameEn": "পাড়িয়া ইউনিয়ন"
              },
              {
                "name": "চাড়োল ইউনিয়ন",
                "nameEn": "চাড়োল ইউনিয়ন"
              },
              {
                "name": "ধনতলা ইউনিয়ন",
                "nameEn": "ধনতলা ইউনিয়ন"
              },
              {
                "name": "বড় পলাশবাড়ী ইউনিয়ন",
                "nameEn": "বড় পলাশবাড়ী ইউনিয়ন"
              },
              {
                "name": "দুওসুও ইউনিয়ন",
                "nameEn": "দুওসুও ইউনিয়ন"
              },
              {
                "name": "ভানোর ইউনিয়ন",
                "nameEn": "ভানোর ইউনিয়ন"
              },
              {
                "name": "আমজানখোর ইউনিয়ন",
                "nameEn": "আমজানখোর ইউনিয়ন"
              },
              {
                "name": "বড়বাড়ি ইউনিয়ন",
                "nameEn": "বড়বাড়ি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "রানীশংকৈল উপজেলা",
            "nameEn": "Ranisankail",
            "unions": [
              {
                "name": "ধর্মগড় ইউনিয়ন",
                "nameEn": "ধর্মগড়"
              },
              {
                "name": "নেকমরদ ইউনিয়ন",
                "nameEn": "নেকমরদ"
              },
              {
                "name": "হোসেনগাঁও ইউনিয়ন",
                "nameEn": "হোসেনগাঁও"
              },
              {
                "name": "লেহেম্বা ইউনিয়ন",
                "nameEn": "লেহেম্বা"
              },
              {
                "name": "বাচোর ইউনিয়ন",
                "nameEn": "বাচোর"
              },
              {
                "name": "কাশিপুর ইউনিয়ন",
                "nameEn": "কাশিপুর"
              },
              {
                "name": "রাতোর ইউনিয়ন",
                "nameEn": "রাতোর"
              },
              {
                "name": "নন্দুয়ার ইউনিয়ন",
                "nameEn": "নন্দুয়ার"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "হরিপুর উপজেলা",
            "nameEn": "Thakurgaon Sadar",
            "unions": [
              {
                "name": "গেদুড়া ইউনিয়ন",
                "nameEn": "গেদুড়া ইউনিয়ন"
              },
              {
                "name": "আমগাঁও ইউনিয়ন",
                "nameEn": "আমগাঁও ইউনিয়ন"
              },
              {
                "name": "বকুয়া ইউনিয়ন",
                "nameEn": "বকুয়া ইউনিয়ন"
              },
              {
                "name": "ডাঙ্গীপাড়া ইউনিয়ন",
                "nameEn": "ডাঙ্গীপাড়া ইউনিয়ন"
              },
              {
                "name": "হরিপুর ইউনিয়ন",
                "nameEn": "হরিপুর ইউনিয়ন"
              },
              {
                "name": "ভাতুরিয়া ইউনিয়ন",
                "nameEn": "ভাতুরিয়া ইউনিয়ন"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Baliadangi পৌরসভা",
            "nameEn": "Baliadangi Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Haripur পৌরসভা",
            "nameEn": "Haripur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Pirganj পৌরসভা",
            "nameEn": "Pirganj Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Ranisankail পৌরসভা",
            "nameEn": "Ranisankail Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      }
    ]
  },
  {
    "name": "রাজশাহী",
    "nameEn": "Rajshahi",
    "districts": [
      {
        "name": "বগুড়া",
        "nameEn": "Bogura",
        "upazilas": [
          {
            "name": "বগুড়া পৌরসভা",
            "nameEn": "Bogura Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              },
              {
                "name": "ওয়ার্ড নং-10",
                "nameEn": "Ward No-10"
              },
              {
                "name": "ওয়ার্ড নং-11",
                "nameEn": "Ward No-11"
              },
              {
                "name": "ওয়ার্ড নং-12",
                "nameEn": "Ward No-12"
              },
              {
                "name": "ওয়ার্ড নং-13",
                "nameEn": "Ward No-13"
              },
              {
                "name": "ওয়ার্ড নং-14",
                "nameEn": "Ward No-14"
              },
              {
                "name": "ওয়ার্ড নং-15",
                "nameEn": "Ward No-15"
              },
              {
                "name": "ওয়ার্ড নং-16",
                "nameEn": "Ward No-16"
              },
              {
                "name": "ওয়ার্ড নং-17",
                "nameEn": "Ward No-17"
              },
              {
                "name": "ওয়ার্ড নং-18",
                "nameEn": "Ward No-18"
              },
              {
                "name": "ওয়ার্ড নং-19",
                "nameEn": "Ward No-19"
              },
              {
                "name": "ওয়ার্ড নং-20",
                "nameEn": "Ward No-20"
              },
              {
                "name": "ওয়ার্ড নং-21",
                "nameEn": "Ward No-21"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "বগুড়া সদর",
            "nameEn": "Adamdighi",
            "unions": [
              {
                "name": "আদমদিঘী",
                "nameEn": "আদমদিঘী"
              },
              {
                "name": "সান্তাহার",
                "nameEn": "সান্তাহার"
              },
              {
                "name": "নশরতপুর",
                "nameEn": "নশরতপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "আদমদিঘী",
            "nameEn": "Bogura Sadar",
            "unions": [
              {
                "name": "বগুড়া সদর",
                "nameEn": "বগুড়া সদর"
              },
              {
                "name": "লাহিড়ীপাড়া",
                "nameEn": "লাহিড়ীপাড়া"
              },
              {
                "name": "সেউজগাড়ী",
                "nameEn": "সেউজগাড়ী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ধুনট",
            "nameEn": "Dhunot",
            "unions": [
              {
                "name": "ধুনট",
                "nameEn": "ধুনট"
              },
              {
                "name": "গোসাইবাড়ী",
                "nameEn": "গোসাইবাড়ী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ধুপচাঁচিয়া",
            "nameEn": "Dhupchancia",
            "unions": [
              {
                "name": "দুপচাঁচিয়া",
                "nameEn": "দুপচাঁচিয়া"
              },
              {
                "name": "তালোড়া",
                "nameEn": "তালোড়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "গাবতলী",
            "nameEn": "Gabtali",
            "unions": [
              {
                "name": "গাবতলী",
                "nameEn": "গাবতলী"
              },
              {
                "name": "কাগইল",
                "nameEn": "কাগইল"
              },
              {
                "name": "মহাস্থানগড়",
                "nameEn": "মহাস্থানগড়"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কাহালু",
            "nameEn": "Kahaloo",
            "unions": [
              {
                "name": "কাহালু",
                "nameEn": "কাহালু"
              },
              {
                "name": "দুর্গাহাটা",
                "nameEn": "দুর্গাহাটা"
              },
              {
                "name": "হাম্মামকুণ্ড",
                "nameEn": "হাম্মামকুণ্ড"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "নন্দীগ্রাম",
            "nameEn": "Nandigram",
            "unions": [
              {
                "name": "নন্দীগ্রাম",
                "nameEn": "নন্দীগ্রাম"
              },
              {
                "name": "আলমপুর",
                "nameEn": "আলমপুর"
              },
              {
                "name": "ভাদুরিয়া",
                "nameEn": "ভাদুরিয়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "সারিয়াকান্দি",
            "nameEn": "Sariakandi",
            "unions": [
              {
                "name": "সারিয়াকান্দি",
                "nameEn": "সারিয়াকান্দি"
              },
              {
                "name": "হাটশেরপুর",
                "nameEn": "হাটশেরপুর"
              },
              {
                "name": "কুতুবপুর",
                "nameEn": "কুতুবপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "শেরপুর",
            "nameEn": "Shajahanpur",
            "unions": [
              {
                "name": "শাজাহানপুর",
                "nameEn": "শাজাহানপুর"
              },
              {
                "name": "আমরুল",
                "nameEn": "আমরুল"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "শিবগঞ্জ",
            "nameEn": "Sherpur",
            "unions": [
              {
                "name": "শেরপুর",
                "nameEn": "শেরপুর"
              },
              {
                "name": "খামারকান্দি",
                "nameEn": "খামারকান্দি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "সোনাতলা",
            "nameEn": "Shibganj",
            "unions": [
              {
                "name": "শিবগঞ্জ",
                "nameEn": "শিবগঞ্জ"
              },
              {
                "name": "মোকামতলা",
                "nameEn": "মোকামতলা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "শাজাহানপুর",
            "nameEn": "Sonatala",
            "unions": [
              {
                "name": "সোনাতলা",
                "nameEn": "সোনাতলা"
              },
              {
                "name": "দিঘলকান্দি",
                "nameEn": "দিঘলকান্দি"
              },
              {
                "name": "পাকুল্লা",
                "nameEn": "পাকুল্লা"
              }
            ],
            "type": "upazila"
          }
        ]
      },
      {
        "name": "চাঁপাইনবাবগঞ্জ",
        "nameEn": "C. nawabganj",
        "upazilas": [
          {
            "name": "চাঁপাইনবাবগঞ্জ পৌরসভা",
            "nameEn": "Chapainawabganj Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "চাঁপাইনবাবগঞ্জ সদর",
            "nameEn": "Bholahat",
            "unions": [
              {
                "name": "ভোলাহাট",
                "nameEn": "ভোলাহাট"
              },
              {
                "name": "গোহালকান্দি",
                "nameEn": "গোহালকান্দি"
              },
              {
                "name": "জামবাড়িয়া",
                "nameEn": "জামবাড়িয়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "গোমস্তাপুর",
            "nameEn": "Gomostapur",
            "unions": [
              {
                "name": "গোমস্তাপুর",
                "nameEn": "গোমস্তাপুর"
              },
              {
                "name": "রাধানগর",
                "nameEn": "রাধানগর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "শিবগঞ্জ",
            "nameEn": "Nachol",
            "unions": [
              {
                "name": "নাচোল",
                "nameEn": "নাচোল"
              },
              {
                "name": "নেজামপুর",
                "nameEn": "নেজামপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "নাচোল",
            "nameEn": "Nawabganj Sadar",
            "unions": [
              {
                "name": "নবাবগঞ্জ সদর",
                "nameEn": "নবাবগঞ্জ সদর"
              },
              {
                "name": "কুমারপুর",
                "nameEn": "কুমারপুর"
              },
              {
                "name": "গোমতানগর",
                "nameEn": "গোমতানগর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ভোলাহাট",
            "nameEn": "Shibganj",
            "unions": [
              {
                "name": "Shibganj সদর",
                "nameEn": "Shibganj Sadar"
              }
            ],
            "type": "upazila"
          }
        ]
      },
      {
        "name": "জয়পুরহাট",
        "nameEn": "Joypurhat",
        "upazilas": [
          {
            "name": "জয়পুরহাট পৌরসভা",
            "nameEn": "Joypurhat Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "জয়পুরহাট সদর",
            "nameEn": "Akkelpur",
            "unions": [
              {
                "name": "আক্কেলপুর",
                "nameEn": "আক্কেলপুর"
              },
              {
                "name": "সোনামুখী",
                "nameEn": "সোনামুখী"
              },
              {
                "name": "রায়পুর",
                "nameEn": "রায়পুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "পাঁচবিবি",
            "nameEn": "Joypurhat Sadar",
            "unions": [
              {
                "name": "জয়পুরহাট সদর",
                "nameEn": "জয়পুরহাট সদর"
              },
              {
                "name": "বেলাল",
                "nameEn": "বেলাল"
              },
              {
                "name": "ধলাহারা",
                "nameEn": "ধলাহারা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কালাই",
            "nameEn": "Kalai",
            "unions": [
              {
                "name": "কালাই",
                "nameEn": "কালাই"
              },
              {
                "name": "পুনাট",
                "nameEn": "পুনাট"
              },
              {
                "name": "মাধবপুর",
                "nameEn": "মাধবপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ক্ষেতলাল",
            "nameEn": "Khetlal",
            "unions": [
              {
                "name": "ক্ষেতলাল",
                "nameEn": "ক্ষেতলাল"
              },
              {
                "name": "বাধাইড়",
                "nameEn": "বাধাইড়"
              },
              {
                "name": "মামুদপুর",
                "nameEn": "মামুদপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "আক্কেলপুর",
            "nameEn": "Panchbibi",
            "unions": [
              {
                "name": "পাঁচবিবি",
                "nameEn": "পাঁচবিবি"
              },
              {
                "name": "আওরঙ্গজেবপুর",
                "nameEn": "আওরঙ্গজেবপুর"
              },
              {
                "name": "কুসুম্বা",
                "nameEn": "কুসুম্বা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Akkelpur পৌরসভা",
            "nameEn": "Akkelpur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Kalai পৌরসভা",
            "nameEn": "Kalai Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Khetlal পৌরসভা",
            "nameEn": "Khetlal Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Panchbibi পৌরসভা",
            "nameEn": "Panchbibi Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "নওগাঁ",
        "nameEn": "Naogaon",
        "upazilas": [
          {
            "name": "নওগাঁ পৌরসভা",
            "nameEn": "Naogaon Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "নওগাঁ সদর",
            "nameEn": "Atrai",
            "unions": [
              {
                "name": "আত্রাই",
                "nameEn": "আত্রাই"
              },
              {
                "name": "মান্দা",
                "nameEn": "মান্দা"
              },
              {
                "name": "বাণগ্রাম",
                "nameEn": "বাণগ্রাম"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "পত্নীতলা",
            "nameEn": "Badalgachi",
            "unions": [
              {
                "name": "বদলগাছী",
                "nameEn": "বদলগাছী"
              },
              {
                "name": "আধাইপুর",
                "nameEn": "আধাইপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ধামইরহাট",
            "nameEn": "Dhamoirhat",
            "unions": [
              {
                "name": "ধামইরহাট",
                "nameEn": "ধামইরহাট"
              },
              {
                "name": "উমার",
                "nameEn": "উমার"
              },
              {
                "name": "আড়ানগর",
                "nameEn": "আড়ানগর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মহাদেবপুর",
            "nameEn": "Manda",
            "unions": [
              {
                "name": "মান্দা",
                "nameEn": "মান্দা"
              },
              {
                "name": "কলম",
                "nameEn": "কলম"
              },
              {
                "name": "প্রাণপুর",
                "nameEn": "প্রাণপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "পরশা",
            "nameEn": "Mohadevpur",
            "unions": [
              {
                "name": "মহাদেবপুর",
                "nameEn": "মহাদেবপুর"
              },
              {
                "name": "এনায়েতপুর",
                "nameEn": "এনায়েতপুর"
              },
              {
                "name": "ভীমপুর",
                "nameEn": "ভীমপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "সাপাহার",
            "nameEn": "Naogaon Sadar",
            "unions": [
              {
                "name": "নওগাঁ সদর",
                "nameEn": "নওগাঁ সদর"
              },
              {
                "name": "কীর্তিপুর",
                "nameEn": "কীর্তিপুর"
              },
              {
                "name": "হাসাইগাড়ী",
                "nameEn": "হাসাইগাড়ী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বদলগাছী",
            "nameEn": "Niamatpur",
            "unions": [
              {
                "name": "নিয়ামতপুর",
                "nameEn": "নিয়ামতপুর"
              },
              {
                "name": "শিরনগর",
                "nameEn": "শিরনগর"
              },
              {
                "name": "চাঁইপুর",
                "nameEn": "চাঁইপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মান্দা",
            "nameEn": "Patnitala",
            "unions": [
              {
                "name": "পত্নীতলা",
                "nameEn": "পত্নীতলা"
              },
              {
                "name": "দিবর",
                "nameEn": "দিবর"
              },
              {
                "name": "মহিষলুটি",
                "nameEn": "মহিষলুটি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "নিয়ামতপুর",
            "nameEn": "Porsha",
            "unions": [
              {
                "name": "পোরশা",
                "nameEn": "পোরশা"
              },
              {
                "name": "নিতপুর",
                "nameEn": "নিতপুর"
              },
              {
                "name": "পত্নীতলা",
                "nameEn": "পত্নীতলা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "আত্রাই",
            "nameEn": "Raninagar",
            "unions": [
              {
                "name": "রাণীনগর",
                "nameEn": "রাণীনগর"
              },
              {
                "name": "পারইল",
                "nameEn": "পারইল"
              },
              {
                "name": "মহিপুর",
                "nameEn": "মহিপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "রাণীনগর",
            "nameEn": "Shapahar",
            "unions": [
              {
                "name": "সাপাহার",
                "nameEn": "সাপাহার"
              },
              {
                "name": "ঐতিহাসিক পাহাড়পুর",
                "nameEn": "ঐতিহাসিক পাহাড়পুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Patnitala পৌরসভা",
            "nameEn": "Patnitala Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Sapahar পৌরসভা",
            "nameEn": "Sapahar Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Porsha পৌরসভা",
            "nameEn": "Porsha Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Dhamoirhat পৌরসভা",
            "nameEn": "Dhamoirhat Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Badalgachhi পৌরসভা",
            "nameEn": "Badalgachhi Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Manda পৌরসভা",
            "nameEn": "Manda Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Atrai পৌরসভা",
            "nameEn": "Atrai Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Raninagar পৌরসভা",
            "nameEn": "Raninagar Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Mahadebpur পৌরসভা",
            "nameEn": "Mahadebpur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Niamatpur পৌরসভা",
            "nameEn": "Niamatpur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "নাটোর",
        "nameEn": "Natore",
        "upazilas": [
          {
            "name": "নাটোর পৌরসভা",
            "nameEn": "Natore Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "নাটোর সদর",
            "nameEn": "Bagatipara",
            "unions": [
              {
                "name": "বাগাতিপাড়া",
                "nameEn": "বাগাতিপাড়া"
              },
              {
                "name": "দয়ারামপুর",
                "nameEn": "দয়ারামপুর"
              },
              {
                "name": "জামবাড়িয়া",
                "nameEn": "জামবাড়িয়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বাগাতিপাড়া",
            "nameEn": "Baraigram",
            "unions": [
              {
                "name": "বড়াইগ্রাম",
                "nameEn": "বড়াইগ্রাম"
              },
              {
                "name": "গোপালপুর",
                "nameEn": "গোপালপুর"
              },
              {
                "name": "জোনাইল",
                "nameEn": "জোনাইল"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বড়াইগ্রাম",
            "nameEn": "Gurudaspur",
            "unions": [
              {
                "name": "গুরুদাসপুর",
                "nameEn": "গুরুদাসপুর"
              },
              {
                "name": "নগর",
                "nameEn": "নগর"
              },
              {
                "name": "পাঁচুপুর",
                "nameEn": "পাঁচুপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "গুরুদাসপুর",
            "nameEn": "Lalpur",
            "unions": [
              {
                "name": "লালপুর",
                "nameEn": "লালপুর"
              },
              {
                "name": "আরবাব",
                "nameEn": "আরবাব"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "লালপুর",
            "nameEn": "Naldanga",
            "unions": [
              {
                "name": "নলডাঙ্গা",
                "nameEn": "নলডাঙ্গা"
              },
              {
                "name": "চলনবিল",
                "nameEn": "চলনবিল"
              },
              {
                "name": "ময়দানদিঘী",
                "nameEn": "ময়দানদিঘী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "সিংড়া",
            "nameEn": "Natore Sadar",
            "unions": [
              {
                "name": "নাটোর সদর",
                "nameEn": "নাটোর সদর"
              },
              {
                "name": "কাচিকাটা",
                "nameEn": "কাচিকাটা"
              },
              {
                "name": "লক্ষ্মীকোল",
                "nameEn": "লক্ষ্মীকোল"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "নলডাঙ্গা",
            "nameEn": "Singra",
            "unions": [
              {
                "name": "সিংড়া",
                "nameEn": "সিংড়া"
              },
              {
                "name": "ছাতনী",
                "nameEn": "ছাতনী"
              },
              {
                "name": "রায়গঞ্জ",
                "nameEn": "রায়গঞ্জ"
              },
              {
                "name": "তাজপুর",
                "nameEn": "তাজপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Bagatipara পৌরসভা",
            "nameEn": "Bagatipara Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Baraigram পৌরসভা",
            "nameEn": "Baraigram Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Gurudaspur পৌরসভা",
            "nameEn": "Gurudaspur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Lalpur পৌরসভা",
            "nameEn": "Lalpur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Singra পৌরসভা",
            "nameEn": "Singra Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "পাবনা",
        "nameEn": "Pabna",
        "upazilas": [
          {
            "name": "পাবনা পৌরসভা",
            "nameEn": "Pabna Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              },
              {
                "name": "ওয়ার্ড নং-10",
                "nameEn": "Ward No-10"
              },
              {
                "name": "ওয়ার্ড নং-11",
                "nameEn": "Ward No-11"
              },
              {
                "name": "ওয়ার্ড নং-12",
                "nameEn": "Ward No-12"
              },
              {
                "name": "ওয়ার্ড নং-13",
                "nameEn": "Ward No-13"
              },
              {
                "name": "ওয়ার্ড নং-14",
                "nameEn": "Ward No-14"
              },
              {
                "name": "ওয়ার্ড নং-15",
                "nameEn": "Ward No-15"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "পাবনা সদর",
            "nameEn": "Atghoria",
            "unions": [
              {
                "name": "আটঘরিয়া",
                "nameEn": "আটঘরিয়া"
              },
              {
                "name": "একদন্ত",
                "nameEn": "একদন্ত"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "আটঘরিয়া",
            "nameEn": "Bera",
            "unions": [
              {
                "name": "বেড়া",
                "nameEn": "বেড়া"
              },
              {
                "name": "নাকালিয়া",
                "nameEn": "নাকালিয়া"
              },
              {
                "name": "ধলারচর",
                "nameEn": "ধলারচর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ঈশ্বরদী",
            "nameEn": "Bhangura",
            "unions": [
              {
                "name": "ভাঙ্গুড়া",
                "nameEn": "ভাঙ্গুড়া"
              },
              {
                "name": "অষ্টমনিষা",
                "nameEn": "অষ্টমনিষা"
              },
              {
                "name": "দিলপাশার",
                "nameEn": "দিলপাশার"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "চাটমোহর",
            "nameEn": "Chatmohar",
            "unions": [
              {
                "name": "চাটমোহর",
                "nameEn": "চাটমোহর"
              },
              {
                "name": "হরিপুর",
                "nameEn": "হরিপুর"
              },
              {
                "name": "মথুরাপুর",
                "nameEn": "মথুরাপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ফরিদপুর",
            "nameEn": "Faridpur",
            "unions": [
              {
                "name": "ফরিদপুর",
                "nameEn": "ফরিদপুর"
              },
              {
                "name": "বিলমাড়িয়া",
                "nameEn": "বিলমাড়িয়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বেড়া",
            "nameEn": "Ishwardi",
            "unions": [
              {
                "name": "ঈশ্বরদী",
                "nameEn": "ঈশ্বরদী"
              },
              {
                "name": "দাশুরিয়া",
                "nameEn": "দাশুরিয়া"
              },
              {
                "name": "সাড়া",
                "nameEn": "সাড়া"
              },
              {
                "name": "পাকশী",
                "nameEn": "পাকশী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ভাঙ্গুড়া",
            "nameEn": "Pabna Sadar",
            "unions": [
              {
                "name": "পাবনা সদর",
                "nameEn": "পাবনা সদর"
              },
              {
                "name": "ধানমন্ডি",
                "nameEn": "ধানমন্ডি"
              },
              {
                "name": "হাটখালী",
                "nameEn": "হাটখালী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "সাঁথিয়া",
            "nameEn": "Santhia",
            "unions": [
              {
                "name": "সাঁথিয়া",
                "nameEn": "সাঁথিয়া"
              },
              {
                "name": "দৌলতপুর",
                "nameEn": "দৌলতপুর"
              },
              {
                "name": "ধুলাউড়ি",
                "nameEn": "ধুলাউড়ি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "সুজানগর",
            "nameEn": "Sujanagar",
            "unions": [
              {
                "name": "সুজানগর",
                "nameEn": "সুজানগর"
              },
              {
                "name": "মাটিকান্দা",
                "nameEn": "মাটিকান্দা"
              },
              {
                "name": "সাগরকান্দি",
                "nameEn": "সাগরকান্দি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Atgharia পৌরসভা",
            "nameEn": "Atgharia Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Bera পৌরসভা",
            "nameEn": "Bera Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Bhangura পৌরসভা",
            "nameEn": "Bhangura Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Chatmohar পৌরসভা",
            "nameEn": "Chatmohar Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Faridpur পৌরসভা",
            "nameEn": "Faridpur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Ishwardi পৌরসভা",
            "nameEn": "Ishwardi Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Santhia পৌরসভা",
            "nameEn": "Santhia Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Sujanagar পৌরসভা",
            "nameEn": "Sujanagar Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "রাজশাহী",
        "nameEn": "Rajshahi",
        "upazilas": [
          {
            "name": "রাজশাহী সিটি কর্পোরেশন",
            "nameEn": "Rajshahi City Corporation",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              },
              {
                "name": "ওয়ার্ড নং-10",
                "nameEn": "Ward No-10"
              },
              {
                "name": "ওয়ার্ড নং-11",
                "nameEn": "Ward No-11"
              },
              {
                "name": "ওয়ার্ড নং-12",
                "nameEn": "Ward No-12"
              },
              {
                "name": "ওয়ার্ড নং-13",
                "nameEn": "Ward No-13"
              },
              {
                "name": "ওয়ার্ড নং-14",
                "nameEn": "Ward No-14"
              },
              {
                "name": "ওয়ার্ড নং-15",
                "nameEn": "Ward No-15"
              },
              {
                "name": "ওয়ার্ড নং-16",
                "nameEn": "Ward No-16"
              },
              {
                "name": "ওয়ার্ড নং-17",
                "nameEn": "Ward No-17"
              },
              {
                "name": "ওয়ার্ড নং-18",
                "nameEn": "Ward No-18"
              },
              {
                "name": "ওয়ার্ড নং-19",
                "nameEn": "Ward No-19"
              },
              {
                "name": "ওয়ার্ড নং-20",
                "nameEn": "Ward No-20"
              },
              {
                "name": "ওয়ার্ড নং-21",
                "nameEn": "Ward No-21"
              },
              {
                "name": "ওয়ার্ড নং-22",
                "nameEn": "Ward No-22"
              },
              {
                "name": "ওয়ার্ড নং-23",
                "nameEn": "Ward No-23"
              },
              {
                "name": "ওয়ার্ড নং-24",
                "nameEn": "Ward No-24"
              },
              {
                "name": "ওয়ার্ড নং-25",
                "nameEn": "Ward No-25"
              },
              {
                "name": "ওয়ার্ড নং-26",
                "nameEn": "Ward No-26"
              },
              {
                "name": "ওয়ার্ড নং-27",
                "nameEn": "Ward No-27"
              },
              {
                "name": "ওয়ার্ড নং-28",
                "nameEn": "Ward No-28"
              },
              {
                "name": "ওয়ার্ড নং-29",
                "nameEn": "Ward No-29"
              },
              {
                "name": "ওয়ার্ড নং-30",
                "nameEn": "Ward No-30"
              }
            ],
            "type": "city_corporation"
          },
          {
            "name": "বাঘা",
            "nameEn": "Bagha",
            "unions": [
              {
                "name": "বাঘা",
                "nameEn": "বাঘা"
              },
              {
                "name": "আড়ানী",
                "nameEn": "আড়ানী"
              },
              {
                "name": "মনিগ্রাম",
                "nameEn": "মনিগ্রাম"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "পুঠিয়া",
            "nameEn": "Bagmara",
            "unions": [
              {
                "name": "বাগমারা",
                "nameEn": "বাগমারা"
              },
              {
                "name": "মাধবদিয়া",
                "nameEn": "মাধবদিয়া"
              },
              {
                "name": "গাড়াগঞ্জ",
                "nameEn": "গাড়াগঞ্জ"
              },
              {
                "name": "তাহেরপুর",
                "nameEn": "তাহেরপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "পবা",
            "nameEn": "Charghat",
            "unions": [
              {
                "name": "চারঘাট",
                "nameEn": "চারঘাট"
              },
              {
                "name": "সরদহ",
                "nameEn": "সরদহ"
              },
              {
                "name": "ভালুকগাছি",
                "nameEn": "ভালুকগাছি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বাগমারা",
            "nameEn": "Durgapur",
            "unions": [
              {
                "name": "দুর্গাপুর",
                "nameEn": "দুর্গাপুর"
              },
              {
                "name": "গ্রামবাংলা",
                "nameEn": "গ্রামবাংলা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "তানোর",
            "nameEn": "Godagari",
            "unions": [
              {
                "name": "গোদাগাড়ী",
                "nameEn": "গোদাগাড়ী"
              },
              {
                "name": "পাকরী",
                "nameEn": "পাকরী"
              },
              {
                "name": "রিশিকুল",
                "nameEn": "রিশিকুল"
              },
              {
                "name": "দেওপাড়া",
                "nameEn": "দেওপাড়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মোহনপুর",
            "nameEn": "Mohanpur",
            "unions": [
              {
                "name": "মোহনপুর",
                "nameEn": "মোহনপুর"
              },
              {
                "name": "নওহাটা",
                "nameEn": "নওহাটা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "চারঘাট",
            "nameEn": "Paba",
            "unions": [
              {
                "name": "পবা",
                "nameEn": "পবা"
              },
              {
                "name": "দর্শনপাড়া",
                "nameEn": "দর্শনপাড়া"
              },
              {
                "name": "হরিপুর",
                "nameEn": "হরিপুর"
              },
              {
                "name": "নওদাপাড়া",
                "nameEn": "নওদাপাড়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "গোদাগাড়ী",
            "nameEn": "Puthia",
            "unions": [
              {
                "name": "পুঠিয়া",
                "nameEn": "পুঠিয়া"
              },
              {
                "name": "বানেশ্বর",
                "nameEn": "বানেশ্বর"
              },
              {
                "name": "ভারতখালী",
                "nameEn": "ভারতখালী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "দূর্গাপুর",
            "nameEn": "Tanore",
            "unions": [
              {
                "name": "তানোর",
                "nameEn": "তানোর"
              },
              {
                "name": "মুন্ডুমালা",
                "nameEn": "মুন্ডুমালা"
              },
              {
                "name": "তালন্দ",
                "nameEn": "তালন্দ"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Bagha পৌরসভা",
            "nameEn": "Bagha Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Bagmara পৌরসভা",
            "nameEn": "Bagmara Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Charghat পৌরসভা",
            "nameEn": "Charghat Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Durgapur পৌরসভা",
            "nameEn": "Durgapur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Godagari পৌরসভা",
            "nameEn": "Godagari Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Mohanpur পৌরসভা",
            "nameEn": "Mohanpur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Paba পৌরসভা",
            "nameEn": "Paba Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Puthia পৌরসভা",
            "nameEn": "Puthia Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Tanore পৌরসভা",
            "nameEn": "Tanore Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "সিরাজগঞ্জ",
        "nameEn": "Sirajganj",
        "upazilas": [
          {
            "name": "সিরাজগঞ্জ পৌরসভা",
            "nameEn": "Sirajganj Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              },
              {
                "name": "ওয়ার্ড নং-10",
                "nameEn": "Ward No-10"
              },
              {
                "name": "ওয়ার্ড নং-11",
                "nameEn": "Ward No-11"
              },
              {
                "name": "ওয়ার্ড নং-12",
                "nameEn": "Ward No-12"
              },
              {
                "name": "ওয়ার্ড নং-13",
                "nameEn": "Ward No-13"
              },
              {
                "name": "ওয়ার্ড নং-14",
                "nameEn": "Ward No-14"
              },
              {
                "name": "ওয়ার্ড নং-15",
                "nameEn": "Ward No-15"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "সিরাজগঞ্জ সদর",
            "nameEn": "Belkuchi",
            "unions": [
              {
                "name": "বেলকুচি",
                "nameEn": "বেলকুচি"
              },
              {
                "name": "ভাটিকয়া",
                "nameEn": "ভাটিকয়া"
              },
              {
                "name": "দুবিলা",
                "nameEn": "দুবিলা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "উল্লাপাড়া",
            "nameEn": "Chowhali",
            "unions": [
              {
                "name": "চৌহালী",
                "nameEn": "চৌহালী"
              },
              {
                "name": "স্তম্ভপুর",
                "nameEn": "স্তম্ভপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কাজীপুর",
            "nameEn": "Kamarkhand",
            "unions": [
              {
                "name": "কামারখন্দ",
                "nameEn": "কামারখন্দ"
              },
              {
                "name": "শেরপুর",
                "nameEn": "শেরপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কামারখন্দ",
            "nameEn": "Kazipur",
            "unions": [
              {
                "name": "কাজীপুর",
                "nameEn": "কাজীপুর"
              },
              {
                "name": "সুবর্ণখালী",
                "nameEn": "সুবর্ণখালী"
              },
              {
                "name": "চরগিরীশ",
                "nameEn": "চরগিরীশ"
              },
              {
                "name": "নাটুয়ারপাড়া",
                "nameEn": "নাটুয়ারপাড়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "চৌহালি",
            "nameEn": "Raiganj",
            "unions": [
              {
                "name": "রায়গঞ্জ",
                "nameEn": "রায়গঞ্জ"
              },
              {
                "name": "সোনাখাড়া",
                "nameEn": "সোনাখাড়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "তাড়াশ",
            "nameEn": "Shahzadpur",
            "unions": [
              {
                "name": "শাহজাদপুর",
                "nameEn": "শাহজাদপুর"
              },
              {
                "name": "কৈজুরী",
                "nameEn": "কৈজুরী"
              },
              {
                "name": "পোতাজিয়া",
                "nameEn": "পোতাজিয়া"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বেলকুচি",
            "nameEn": "Sirajganj Sadar",
            "unions": [
              {
                "name": "সিরাজগঞ্জ সদর",
                "nameEn": "সিরাজগঞ্জ সদর"
              },
              {
                "name": "খোকশাবাড়ী",
                "nameEn": "খোকশাবাড়ী"
              },
              {
                "name": "রতনকান্দি",
                "nameEn": "রতনকান্দি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "রায়গঞ্জ",
            "nameEn": "Tarash",
            "unions": [
              {
                "name": "তাড়াশ",
                "nameEn": "তাড়াশ"
              },
              {
                "name": "নারঙ্গী",
                "nameEn": "নারঙ্গী"
              },
              {
                "name": "মাঝাইল",
                "nameEn": "মাঝাইল"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "শাহজাদপুর",
            "nameEn": "Ullapara",
            "unions": [
              {
                "name": "উল্লাপাড়া",
                "nameEn": "উল্লাপাড়া"
              },
              {
                "name": "সলঙ্গা",
                "nameEn": "সলঙ্গা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Belkuchi পৌরসভা",
            "nameEn": "Belkuchi Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Chauhali পৌরসভা",
            "nameEn": "Chauhali Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Kamarkhanda পৌরসভা",
            "nameEn": "Kamarkhanda Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Kazipur পৌরসভা",
            "nameEn": "Kazipur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Raiganj পৌরসভা",
            "nameEn": "Raiganj Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Shahjadpur পৌরসভা",
            "nameEn": "Shahjadpur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Tarash পৌরসভা",
            "nameEn": "Tarash Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Ullahpara পৌরসভা",
            "nameEn": "Ullahpara Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      }
    ]
  },
  {
    "name": "সিলেট",
    "nameEn": "Sylhet",
    "districts": [
      {
        "name": "হবিগঞ্জ",
        "nameEn": "Habiganj",
        "upazilas": [
          {
            "name": "হবিগঞ্জ পৌরসভা",
            "nameEn": "Habiganj Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "হবিগঞ্জ সদর উপজেলা",
            "nameEn": "Azmiriganj",
            "unions": [
              {
                "name": "লোকরা ইউনিয়ন",
                "nameEn": "লোকরা"
              },
              {
                "name": "রিচি ইউনিয়ন",
                "nameEn": "রিচি"
              },
              {
                "name": "তেঘরিয়া ইউনিয়ন",
                "nameEn": "তেঘরিয়া"
              },
              {
                "name": "পৈল ইউনিয়ন",
                "nameEn": "পৈল"
              },
              {
                "name": "গোপায়া ইউনিয়ন",
                "nameEn": "গোপায়া"
              },
              {
                "name": "রাজিউরা ইউনিয়ন",
                "nameEn": "রাজিউরা"
              },
              {
                "name": "নিজামপুর ইউনিয়ন",
                "nameEn": "নিজামপুর"
              },
              {
                "name": "লস্করপুর ইউনিয়ন",
                "nameEn": "লস্করপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "আজমিরীগঞ্জ উপজেলা",
            "nameEn": "Bahubal",
            "unions": [
              {
                "name": "আজমিরীগঞ্জ সদর ইউনিয়ন",
                "nameEn": "আজমিরীগঞ্জ সদর"
              },
              {
                "name": "বদলপুর ইউনিয়ন",
                "nameEn": "বদলপুর"
              },
              {
                "name": "জলসুখা ইউনিয়ন",
                "nameEn": "জলসুখা"
              },
              {
                "name": "শিবপাশা ইউনিয়ন",
                "nameEn": "শিবপাশা"
              },
              {
                "name": "কাকাইলছেও ইউনিয়ন",
                "nameEn": "কাকাইলছেও"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "চুনারুঘাট উপজেলা",
            "nameEn": "Baniachong",
            "unions": [
              {
                "name": "গাজীপুর ইউনিয়ন",
                "nameEn": "গাজীপুর"
              },
              {
                "name": "আহম্মদাবাদ ইউনিয়ন",
                "nameEn": "আহম্মদাবাদ"
              },
              {
                "name": "দেওরগাছ ইউনিয়ন",
                "nameEn": "দেওরগাছ"
              },
              {
                "name": "পাইকপাড়া ইউনিয়ন",
                "nameEn": "পাইকপাড়া"
              },
              {
                "name": "শানখলা ইউনিয়ন",
                "nameEn": "শানখলা"
              },
              {
                "name": "চুনারুঘাট ইউনিয়ন",
                "nameEn": "চুনারুঘাট"
              },
              {
                "name": "উবাহাটা ইউনিয়ন",
                "nameEn": "উবাহাটা"
              },
              {
                "name": "সাটিয়াজুরী ইউনিয়ন",
                "nameEn": "সাটিয়াজুরী"
              },
              {
                "name": "রাণীগাঁও ইউনিয়ন",
                "nameEn": "রাণীগাঁও"
              },
              {
                "name": "মিরাশী ইউনিয়ন",
                "nameEn": "মিরাশী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "নবীগঞ্জ উপজেলা",
            "nameEn": "Chunarughat",
            "unions": [
              {
                "name": "বড়ভাকৈর পশ্চিম ইউনিয়ন",
                "nameEn": "বড়ভাকৈর পশ্চিম"
              },
              {
                "name": "বড়ভাকৈর পূর্ব ইউনিয়ন",
                "nameEn": "বড়ভাকৈর পূর্ব"
              },
              {
                "name": "ইনাতগঞ্জ ইউনিয়ন",
                "nameEn": "ইনাতগঞ্জ"
              },
              {
                "name": "দীঘলবাক ইউনিয়ন",
                "nameEn": "দীঘলবাক"
              },
              {
                "name": "আউশকান্দি ইউনিয়ন",
                "nameEn": "আউশকান্দি"
              },
              {
                "name": "কুর্শি ইউনিয়ন",
                "nameEn": "কুর্শি"
              },
              {
                "name": "করগাঁও ইউনিয়ন",
                "nameEn": "করগাঁও"
              },
              {
                "name": "নবীগঞ্জ সদর ইউনিয়ন",
                "nameEn": "নবীগঞ্জ সদর"
              },
              {
                "name": "বাউসা ইউনিয়ন",
                "nameEn": "বাউসা"
              },
              {
                "name": "দেবপাড়া ইউনিয়ন",
                "nameEn": "দেবপাড়া"
              },
              {
                "name": "গজনাইপুর ইউনিয়ন",
                "nameEn": "গজনাইপুর"
              },
              {
                "name": "কালিয়ারভাঙ্গা ইউনিয়ন",
                "nameEn": "কালিয়ারভাঙ্গা"
              },
              {
                "name": "পানিউমদা ইউনিয়ন",
                "nameEn": "পানিউমদা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বানিয়াচং উপজেলা",
            "nameEn": "Habiganj Sadar",
            "unions": [
              {
                "name": "বানিয়াচং উত্তর পূর্ব ইউনিয়ন",
                "nameEn": "বানিয়াচং উত্তর পূর্ব"
              },
              {
                "name": "বানিয়াচং উত্তর পশ্চিম ইউনিয়ন",
                "nameEn": "বানিয়াচং উত্তর পশ্চিম"
              },
              {
                "name": "বানিয়াচং দক্ষিণ পূর্ব ইউনিয়ন",
                "nameEn": "বানিয়াচং দক্ষিণ পূর্ব"
              },
              {
                "name": "বানিয়াচং দক্ষিণ পশ্চিম ইউনিয়ন",
                "nameEn": "বানিয়াচং দক্ষিণ পশ্চিম"
              },
              {
                "name": "দৌলতপুর ইউনিয়ন",
                "nameEn": "দৌলতপুর"
              },
              {
                "name": "কাগাপাশা ইউনিয়ন",
                "nameEn": "কাগাপাশা"
              },
              {
                "name": "বড়ইউড়ি ইউনিয়ন",
                "nameEn": "বড়ইউড়ি"
              },
              {
                "name": "খাগাউড়া ইউনিয়ন",
                "nameEn": "খাগাউড়া"
              },
              {
                "name": "পুকড়া ইউনিয়ন",
                "nameEn": "পুকড়া"
              },
              {
                "name": "সুবিদপুর ইউনিয়ন",
                "nameEn": "সুবিদপুর"
              },
              {
                "name": "মক্রমপুর ইউনিয়ন",
                "nameEn": "মক্রমপুর"
              },
              {
                "name": "সুজাতপুর ইউনিয়ন",
                "nameEn": "সুজাতপুর"
              },
              {
                "name": "মন্দরী ইউনিয়ন",
                "nameEn": "মন্দরী"
              },
              {
                "name": "মুরাদপুর ইউনিয়ন",
                "nameEn": "মুরাদপুর"
              },
              {
                "name": "পৈলারকান্দি ইউনিয়ন",
                "nameEn": "পৈলারকান্দি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বাহুবল উপজেলা",
            "nameEn": "Lakhai",
            "unions": [
              {
                "name": "স্নানঘাট ইউনিয়ন",
                "nameEn": "স্নানঘাট"
              },
              {
                "name": "পুটিজুরী ইউনিয়ন",
                "nameEn": "পুটিজুরী"
              },
              {
                "name": "সাতকাপন ইউনিয়ন",
                "nameEn": "সাতকাপন"
              },
              {
                "name": "বাহুবল সদর ইউনিয়ন",
                "nameEn": "বাহুবল সদর"
              },
              {
                "name": "লামাতাশী ইউনিয়ন",
                "nameEn": "লামাতাশী"
              },
              {
                "name": "মীরপুর ইউনিয়ন",
                "nameEn": "মীরপুর"
              },
              {
                "name": "ভাদেশ্বর ইউনিয়ন",
                "nameEn": "ভাদেশ্বর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মাধবপুর উপজেলা",
            "nameEn": "Madhabpur",
            "unions": [
              {
                "name": "আদাঐর ইউনিয়ন",
                "nameEn": "আদাঐর"
              },
              {
                "name": "আন্দিউরা ইউনিয়ন",
                "nameEn": "আন্দিউরা"
              },
              {
                "name": "চৌমুহনী ইউনিয়ন",
                "nameEn": "চৌমুহনী"
              },
              {
                "name": "ছাতিয়াইন ইউনিয়ন",
                "nameEn": "ছাতিয়াইন"
              },
              {
                "name": "জগদীশপুর ইউনিয়ন",
                "nameEn": "জগদীশপুর"
              },
              {
                "name": "ধর্মঘর ইউনিয়ন",
                "nameEn": "ধর্মঘর"
              },
              {
                "name": "নোয়াপাড়া ইউনিয়ন",
                "nameEn": "নোয়াপাড়া"
              },
              {
                "name": "বাঘাসুরা ইউনিয়ন",
                "nameEn": "বাঘাসুরা"
              },
              {
                "name": "বহরা ইউনিয়ন",
                "nameEn": "বহরা"
              },
              {
                "name": "শাহজাহানপুর ইউনিয়ন",
                "nameEn": "শাহজাহানপুর"
              },
              {
                "name": "বুল্লা ইউনিয়ন",
                "nameEn": "বুল্লা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "লাখাই উপজেলা",
            "nameEn": "Nabiganj",
            "unions": [
              {
                "name": "লাখাই ইউনিয়ন",
                "nameEn": "লাখাই"
              },
              {
                "name": "মোড়াকরি ইউনিয়ন",
                "nameEn": "মোড়াকরি"
              },
              {
                "name": "মুড়িয়াউক ইউনিয়ন",
                "nameEn": "মুড়িয়াউক"
              },
              {
                "name": "বামৈ ইউনিয়ন",
                "nameEn": "বামৈ"
              },
              {
                "name": "করাব ইউনিয়ন",
                "nameEn": "করাব"
              },
              {
                "name": "বুল্লা ইউনিয়ন",
                "nameEn": "বুল্লা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "শায়েস্তাগঞ্জ উপজেলা",
            "nameEn": "Sayestaganj",
            "unions": [
              {
                "name": "নূরপুর ইউনিয়ন",
                "nameEn": "নূরপুর"
              },
              {
                "name": "শায়েস্তাগঞ্জ ইউনিয়ন",
                "nameEn": "শায়েস্তাগঞ্জ"
              },
              {
                "name": "ব্রাহ্মনডোরা ইউনিয়ন",
                "nameEn": "ব্রাহ্মনডোরা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Chunarughat পৌরসভা",
            "nameEn": "Chunarughat Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Bahubal পৌরসভা",
            "nameEn": "Bahubal Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Nabiganj পৌরসভা",
            "nameEn": "Nabiganj Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Baniachong পৌরসভা",
            "nameEn": "Baniachong Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Lakhai পৌরসভা",
            "nameEn": "Lakhai Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Madhabpur পৌরসভা",
            "nameEn": "Madhabpur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Ajmiriganj পৌরসভা",
            "nameEn": "Ajmiriganj Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Shaistaganj পৌরসভা",
            "nameEn": "Shaistaganj Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "মৌলভীবাজার",
        "nameEn": "Moulvibazar",
        "upazilas": [
          {
            "name": "মৌলভীবাজার পৌরসভা",
            "nameEn": "Moulvibazar Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "কমলগঞ্জ উপজেলা",
            "nameEn": "Barlekha",
            "unions": [
              {
                "name": "রহিমপুর",
                "nameEn": "রহিমপুর"
              },
              {
                "name": "পতনঊষার",
                "nameEn": "পতনঊষার"
              },
              {
                "name": "মুন্সিবাজার",
                "nameEn": "মুন্সিবাজার"
              },
              {
                "name": "শমসেরনগর",
                "nameEn": "শমসেরনগর"
              },
              {
                "name": "কমলগঞ্জ",
                "nameEn": "কমলগঞ্জ"
              },
              {
                "name": "আলীনগর",
                "nameEn": "আলীনগর"
              },
              {
                "name": "আদমপুর",
                "nameEn": "আদমপুর"
              },
              {
                "name": "মাধবপুর",
                "nameEn": "মাধবপুর"
              },
              {
                "name": "ইসলামপুর",
                "nameEn": "ইসলামপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কুলাউড়া উপজেলা",
            "nameEn": "Juri",
            "unions": [
              {
                "name": "বরমচাল",
                "nameEn": "বরমচাল"
              },
              {
                "name": "ভূকশিমইল",
                "nameEn": "ভূকশিমইল"
              },
              {
                "name": "ভাটেরা",
                "nameEn": "ভাটেরা"
              },
              {
                "name": "জয়চণ্ডী",
                "nameEn": "জয়চণ্ডী"
              },
              {
                "name": "ব্রাহ্মণবাজার",
                "nameEn": "ব্রাহ্মণবাজার"
              },
              {
                "name": "কাদিপুর",
                "nameEn": "কাদিপুর"
              },
              {
                "name": "কুলাউড়া",
                "nameEn": "কুলাউড়া"
              },
              {
                "name": "রাউৎগাঁও",
                "nameEn": "রাউৎগাঁও"
              },
              {
                "name": "টিলাগাঁও",
                "nameEn": "টিলাগাঁও"
              },
              {
                "name": "হাজীপুর",
                "nameEn": "হাজীপুর"
              },
              {
                "name": "শরীফপুর",
                "nameEn": "শরীফপুর"
              },
              {
                "name": "পৃথিমপাশা",
                "nameEn": "পৃথিমপাশা"
              },
              {
                "name": "কর্মধা",
                "nameEn": "কর্মধা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "জুড়ী উপজেলা",
            "nameEn": "Kamalganj",
            "unions": [
              {
                "name": "পূর্ব জুড়ী",
                "nameEn": "পূর্ব জুড়ী"
              },
              {
                "name": "পশ্চিম জুড়ী",
                "nameEn": "পশ্চিম জুড়ী"
              },
              {
                "name": "জায়ফরনগর",
                "nameEn": "জায়ফরনগর"
              },
              {
                "name": "সাগরনাল",
                "nameEn": "সাগরনাল"
              },
              {
                "name": "ফুলতলা ",
                "nameEn": "ফুলতলা"
              },
              {
                "name": "গোয়ালবাড়ী",
                "nameEn": "গোয়ালবাড়ী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বড়লেখা উপজেলা",
            "nameEn": "Kulaura",
            "unions": [
              {
                "name": "বর্ণি",
                "nameEn": "বর্ণি"
              },
              {
                "name": "দাসের বাজার",
                "nameEn": "দাসের বাজার"
              },
              {
                "name": "নিজ বাহাদুরপুর",
                "nameEn": "নিজ বাহাদুরপুর"
              },
              {
                "name": "উত্তর শাহবাজপুর",
                "nameEn": "উত্তর শাহবাজপুর"
              },
              {
                "name": "দক্ষিণ শাহবাজপুর",
                "nameEn": "দক্ষিণ শাহবাজপুর"
              },
              {
                "name": "বড়লেখা",
                "nameEn": "বড়লেখা"
              },
              {
                "name": "তালিমপুর",
                "nameEn": "তালিমপুর"
              },
              {
                "name": "দক্ষিণভাগ উত্তর",
                "nameEn": "দক্ষিণভাগ উত্তর"
              },
              {
                "name": "সুজানগর",
                "nameEn": "সুজানগর"
              },
              {
                "name": "দক্ষিণভাগ দক্ষিণ",
                "nameEn": "দক্ষিণভাগ দক্ষিণ"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মৌলভীবাজার সদর",
            "nameEn": "Moulvibazar Sadar",
            "unions": [
              {
                "name": "খলিলপুর",
                "nameEn": "খলিলপুর"
              },
              {
                "name": "মনুমুখ",
                "nameEn": "মনুমুখ"
              },
              {
                "name": "কামালপুর",
                "nameEn": "কামালপুর"
              },
              {
                "name": "আপার কাগাবলা",
                "nameEn": "আপার কাগাবলা"
              },
              {
                "name": "আখাইলকুড়া",
                "nameEn": "আখাইলকুড়া"
              },
              {
                "name": "একাটুনা",
                "nameEn": "একাটুনা"
              },
              {
                "name": "চাঁদনীঘাট",
                "nameEn": "চাঁদনীঘাট"
              },
              {
                "name": "কনকপুর",
                "nameEn": "কনকপুর"
              },
              {
                "name": "আমতৈল",
                "nameEn": "আমতৈল"
              },
              {
                "name": "নাজিরাবাদ",
                "nameEn": "নাজিরাবাদ"
              },
              {
                "name": "মোস্তফাপুর  ",
                "nameEn": "মোস্তফাপুর"
              },
              {
                "name": "গিয়াসনগর",
                "nameEn": "গিয়াসনগর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "রাজনগর উপজেলা",
            "nameEn": "Rajnagar",
            "unions": [
              {
                "name": "ফতেপুর",
                "nameEn": "ফতেপুর"
              },
              {
                "name": "উত্তরভাগ",
                "nameEn": "উত্তরভাগ"
              },
              {
                "name": "মুন্সিবাজার",
                "nameEn": "মুন্সিবাজার"
              },
              {
                "name": "পাঁচগাঁও",
                "nameEn": "পাঁচগাঁও"
              },
              {
                "name": "রাজনগর",
                "nameEn": "রাজনগর"
              },
              {
                "name": "টেংরা",
                "nameEn": "টেংরা"
              },
              {
                "name": "কামারচাক  ",
                "nameEn": "কামারচাক"
              },
              {
                "name": "মনসুরনগর",
                "nameEn": "মনসুরনগর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "শ্রীমঙ্গল উপজেলা",
            "nameEn": "Sreemangal",
            "unions": [
              {
                "name": "মির্জাপুর",
                "nameEn": "মির্জাপুর"
              },
              {
                "name": "ভূনবীর",
                "nameEn": "ভূনবীর"
              },
              {
                "name": "শ্রীমঙ্গল",
                "nameEn": "শ্রীমঙ্গল"
              },
              {
                "name": "সিন্দুরখান",
                "nameEn": "সিন্দুরখান"
              },
              {
                "name": "কালাপুর",
                "nameEn": "কালাপুর"
              },
              {
                "name": "আশিদ্রোন",
                "nameEn": "আশিদ্রোন"
              },
              {
                "name": "রাজঘাট",
                "nameEn": "রাজঘাট"
              },
              {
                "name": "কালীঘাট ",
                "nameEn": "কালীঘাট"
              },
              {
                "name": "সাতগাঁও",
                "nameEn": "সাতগাঁও"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Sreemangal পৌরসভা",
            "nameEn": "Sreemangal Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Kamalganj পৌরসভা",
            "nameEn": "Kamalganj Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Kulaura পৌরসভা",
            "nameEn": "Kulaura Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Rajnagar পৌরসভা",
            "nameEn": "Rajnagar Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Barlekha পৌরসভা",
            "nameEn": "Barlekha Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Juri পৌরসভা",
            "nameEn": "Juri Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "সুনামগঞ্জ",
        "nameEn": "Sunamganj",
        "upazilas": [
          {
            "name": "সুনামগঞ্জ পৌরসভা",
            "nameEn": "Sunamganj Municipality",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "জামালগঞ্জ",
            "nameEn": "Biswamvarpur",
            "unions": [
              {
                "name": "জামালগঞ্জ",
                "nameEn": "জামালগঞ্জ"
              },
              {
                "name": "সাচনা বাচার",
                "nameEn": "সাচনা বাচার"
              },
              {
                "name": "বেহেলী",
                "nameEn": "বেহেলী"
              },
              {
                "name": "ভীমখালী",
                "nameEn": "ভীমখালী"
              },
              {
                "name": "ফেনারবাক",
                "nameEn": "ফেনারবাক"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ধর্মপাশা",
            "nameEn": "Chatak",
            "unions": [
              {
                "name": "ধর্মপাশা",
                "nameEn": "ধর্মপাশা"
              },
              {
                "name": "সেলবরষ",
                "nameEn": "সেলবরষ"
              },
              {
                "name": "পাইকুরাটি",
                "nameEn": "পাইকুরাটি"
              },
              {
                "name": "জয়শ্রী",
                "nameEn": "জয়শ্রী"
              },
              {
                "name": "উঃ",
                "nameEn": "উঃ"
              },
              {
                "name": "দঃ",
                "nameEn": "দঃ"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "মধ্যনগর",
            "nameEn": "Dakhin Sunamganj",
            "unions": [
              {
                "name": "মধ্যনগর",
                "nameEn": "মধ্যনগর"
              },
              {
                "name": "চামারদানী",
                "nameEn": "চামারদানী"
              },
              {
                "name": "বংশীকুন্ডা(দঃ)",
                "nameEn": "বংশীকুন্ডা(দঃ)"
              },
              {
                "name": "বংশীকুন্ডা(উঃ)",
                "nameEn": "বংশীকুন্ডা(উঃ)"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "তাহিরপুর",
            "nameEn": "Derai",
            "unions": [
              {
                "name": "শ্রীপুর উত্তর",
                "nameEn": "শ্রীপুর উত্তর"
              },
              {
                "name": "শ্রীপুর দক্ষিণ",
                "nameEn": "শ্রীপুর দক্ষিণ"
              },
              {
                "name": "বড়দল দক্ষিণ",
                "nameEn": "বড়দল দক্ষিণ"
              },
              {
                "name": "বড়দল উত্তর",
                "nameEn": "বড়দল উত্তর"
              },
              {
                "name": "বাদাঘাট",
                "nameEn": "বাদাঘাট"
              },
              {
                "name": "তাহিরপুর",
                "nameEn": "তাহিরপুর"
              },
              {
                "name": "বালিজুরী",
                "nameEn": "বালিজুরী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "শাল্লা",
            "nameEn": "Dharmapasha",
            "unions": [
              {
                "name": "আটগাঁও",
                "nameEn": "আটগাঁও"
              },
              {
                "name": "হবিবপুর",
                "nameEn": "হবিবপুর"
              },
              {
                "name": "বাহাড়া",
                "nameEn": "বাহাড়া"
              },
              {
                "name": "শাল্লা",
                "nameEn": "শাল্লা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "শান্তিগঞ্জ",
            "nameEn": "Doarabazar",
            "unions": [
              {
                "name": "জয়কলস",
                "nameEn": "জয়কলস"
              },
              {
                "name": "শিমুলবাক",
                "nameEn": "শিমুলবাক"
              },
              {
                "name": "পাথারিয়া",
                "nameEn": "পাথারিয়া"
              },
              {
                "name": "পশ্চিম বীরগাঁও",
                "nameEn": "পশ্চিম বীরগাঁও"
              },
              {
                "name": "পূর্ববীরগাঁও",
                "nameEn": "পূর্ববীরগাঁও"
              },
              {
                "name": "পশি্চম পাগলা",
                "nameEn": "পশি্চম পাগলা"
              },
              {
                "name": "পূর্ব পাগলা",
                "nameEn": "পূর্ব পাগলা"
              },
              {
                "name": "দরগাপাশা",
                "nameEn": "দরগাপাশা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "দিরাই",
            "nameEn": "Jagannathpur",
            "unions": [
              {
                "name": "রফিনগর",
                "nameEn": "রফিনগর"
              },
              {
                "name": "ভাটিপাড়া",
                "nameEn": "ভাটিপাড়া"
              },
              {
                "name": "রাজানগর",
                "nameEn": "রাজানগর"
              },
              {
                "name": "চরনারচর",
                "nameEn": "চরনারচর"
              },
              {
                "name": "দিরাই সরমঙ্গল",
                "nameEn": "দিরাই সরমঙ্গল"
              },
              {
                "name": "করিমপুর",
                "nameEn": "করিমপুর"
              },
              {
                "name": "জগদল",
                "nameEn": "জগদল"
              },
              {
                "name": "তাড়ল",
                "nameEn": "তাড়ল"
              },
              {
                "name": "কুলঞ্জ",
                "nameEn": "কুলঞ্জ"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "জগন্নাথপুর",
            "nameEn": "Jamalganj",
            "unions": [
              {
                "name": "কলকলিয়া ইউপি",
                "nameEn": "কলকলিয়া ইউপি"
              },
              {
                "name": "পাটলী ইউপি",
                "nameEn": "পাটলী ইউপি"
              },
              {
                "name": "মীরপুর ইউপি",
                "nameEn": "মীরপুর ইউপি"
              },
              {
                "name": "চিলাউড়া হলদিপুর ইউপি",
                "nameEn": "চিলাউড়া হলদিপুর ইউপি"
              },
              {
                "name": "রাণীগঞ্জ ইউপি",
                "nameEn": "রাণীগঞ্জ ইউপি"
              },
              {
                "name": "সৈয়দপুর শাহারপাড়া ইউপি",
                "nameEn": "সৈয়দপুর শাহারপাড়া ইউপি"
              },
              {
                "name": "আশারকান্দি ইউপি",
                "nameEn": "আশারকান্দি ইউপি"
              },
              {
                "name": "পাইলগাঁও ইউপি",
                "nameEn": "পাইলগাঁও ইউপি"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "সুনামগঞ্জ",
            "nameEn": "Sulla",
            "unions": [
              {
                "name": "আপ্তাবনগর",
                "nameEn": "আপ্তাবনগর"
              },
              {
                "name": "মোল্লাপাড়া",
                "nameEn": "মোল্লাপাড়া"
              },
              {
                "name": "রঙ্গারচর",
                "nameEn": "রঙ্গারচর"
              },
              {
                "name": "জাহাঙ্গীরনগর",
                "nameEn": "জাহাঙ্গীরনগর"
              },
              {
                "name": "সুরমা",
                "nameEn": "সুরমা"
              },
              {
                "name": "গৌরারং",
                "nameEn": "গৌরারং"
              },
              {
                "name": "মোহনপুর",
                "nameEn": "মোহনপুর"
              },
              {
                "name": "কাঠইর",
                "nameEn": "কাঠইর"
              },
              {
                "name": "লক্ষণশ্রী",
                "nameEn": "লক্ষণশ্রী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "দোয়ারাবাজার",
            "nameEn": "Sunamganj Sadar",
            "unions": [
              {
                "name": "লক্ষীপুর",
                "nameEn": "লক্ষীপুর"
              },
              {
                "name": "বাংলাবাজার",
                "nameEn": "বাংলাবাজার"
              },
              {
                "name": "নরসিংপুর",
                "nameEn": "নরসিংপুর"
              },
              {
                "name": "মান্নারগাঁও",
                "nameEn": "মান্নারগাঁও"
              },
              {
                "name": "পান্ডারগাঁও",
                "nameEn": "পান্ডারগাঁও"
              },
              {
                "name": "দোহালিয়া",
                "nameEn": "দোহালিয়া"
              },
              {
                "name": "দোয়ারাবাজার",
                "nameEn": "দোয়ারাবাজার"
              },
              {
                "name": "বোগলাবাজার",
                "nameEn": "বোগলাবাজার"
              },
              {
                "name": "সুরমা",
                "nameEn": "সুরমা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বিশ্বম্ভরপুর",
            "nameEn": "Tahirpur",
            "unions": [
              {
                "name": "সলুকাবাদ",
                "nameEn": "সলুকাবাদ"
              },
              {
                "name": "ধনপুর",
                "nameEn": "ধনপুর"
              },
              {
                "name": "পলাশ",
                "nameEn": "পলাশ"
              },
              {
                "name": "বাদাঘাট(দঃ)",
                "nameEn": "বাদাঘাট(দঃ)"
              },
              {
                "name": "ফতেপুর",
                "nameEn": "ফতেপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ছাতক",
            "nameEn": "ছাতক",
            "unions": [
              {
                "name": "ছাতক ইউনিয়ন পরিষদ",
                "nameEn": "ছাতক ইউনিয়ন পরিষদ"
              },
              {
                "name": "ছৈলা-আফজলাবাদ ইউপি",
                "nameEn": "ছৈলা-আফজলাবাদ ইউপি"
              },
              {
                "name": "নোয়ারাই ইউপি",
                "nameEn": "নোয়ারাই ইউপি"
              },
              {
                "name": "কালারুকা ইউপি।",
                "nameEn": "কালারুকা ইউপি।"
              },
              {
                "name": "গোবিন্দগঞ্জ-সৈদেরগাও",
                "nameEn": "গোবিন্দগঞ্জ-সৈদেরগাও"
              },
              {
                "name": "খুরমা উত্তর",
                "nameEn": "খুরমা উত্তর"
              },
              {
                "name": "দক্ষিণ খুরমা",
                "nameEn": "দক্ষিণ খুরমা"
              },
              {
                "name": "চরমহল্লা",
                "nameEn": "চরমহল্লা"
              },
              {
                "name": "ইসলামপুর",
                "nameEn": "ইসলামপুর"
              },
              {
                "name": "জাউয়া বাজার",
                "nameEn": "জাউয়া বাজার"
              },
              {
                "name": "সিংচাপইড়",
                "nameEn": "সিংচাপইড়"
              },
              {
                "name": "দোলার বাজার",
                "nameEn": "দোলার বাজার"
              },
              {
                "name": "ভাতগাও",
                "nameEn": "ভাতগাও"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Chhatak পৌরসভা",
            "nameEn": "Chhatak Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Jagannathpur পৌরসভা",
            "nameEn": "Jagannathpur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Tahirpur পৌরসভা",
            "nameEn": "Tahirpur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Bishwamvarpur পৌরসভা",
            "nameEn": "Bishwamvarpur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Dharmapasha পৌরসভা",
            "nameEn": "Dharmapasha Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Jamalganj পৌরসভা",
            "nameEn": "Jamalganj Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Derai পৌরসভা",
            "nameEn": "Derai Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Sulla পৌরসভা",
            "nameEn": "Sulla Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Dowarabazar পৌরসভা",
            "nameEn": "Dowarabazar Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      },
      {
        "name": "সিলেট",
        "nameEn": "Sylhet",
        "upazilas": [
          {
            "name": "সিলেট সিটি কর্পোরেশন",
            "nameEn": "Sylhet City Corporation",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              },
              {
                "name": "ওয়ার্ড নং-10",
                "nameEn": "Ward No-10"
              },
              {
                "name": "ওয়ার্ড নং-11",
                "nameEn": "Ward No-11"
              },
              {
                "name": "ওয়ার্ড নং-12",
                "nameEn": "Ward No-12"
              },
              {
                "name": "ওয়ার্ড নং-13",
                "nameEn": "Ward No-13"
              },
              {
                "name": "ওয়ার্ড নং-14",
                "nameEn": "Ward No-14"
              },
              {
                "name": "ওয়ার্ড নং-15",
                "nameEn": "Ward No-15"
              },
              {
                "name": "ওয়ার্ড নং-16",
                "nameEn": "Ward No-16"
              },
              {
                "name": "ওয়ার্ড নং-17",
                "nameEn": "Ward No-17"
              },
              {
                "name": "ওয়ার্ড নং-18",
                "nameEn": "Ward No-18"
              },
              {
                "name": "ওয়ার্ড নং-19",
                "nameEn": "Ward No-19"
              },
              {
                "name": "ওয়ার্ড নং-20",
                "nameEn": "Ward No-20"
              },
              {
                "name": "ওয়ার্ড নং-21",
                "nameEn": "Ward No-21"
              },
              {
                "name": "ওয়ার্ড নং-22",
                "nameEn": "Ward No-22"
              },
              {
                "name": "ওয়ার্ড নং-23",
                "nameEn": "Ward No-23"
              },
              {
                "name": "ওয়ার্ড নং-24",
                "nameEn": "Ward No-24"
              },
              {
                "name": "ওয়ার্ড নং-25",
                "nameEn": "Ward No-25"
              },
              {
                "name": "ওয়ার্ড নং-26",
                "nameEn": "Ward No-26"
              },
              {
                "name": "ওয়ার্ড নং-27",
                "nameEn": "Ward No-27"
              }
            ],
            "type": "city_corporation"
          },
          {
            "name": "সিলেট সদর উপজেলা",
            "nameEn": "Balaganj",
            "unions": [
              {
                "name": "কান্দিগাঁও ইউনিয়ন",
                "nameEn": "কান্দিগাঁও"
              },
              {
                "name": "খাদিমনগর ইউনিয়ন",
                "nameEn": "খাদিমনগর"
              },
              {
                "name": "খাদিমপাড়া ইউনিয়ন",
                "nameEn": "খাদিমপাড়া"
              },
              {
                "name": "জালালাবাদ ইউনিয়ন",
                "nameEn": "জালালাবাদ"
              },
              {
                "name": "টুকের বাজার ইউনিয়ন",
                "nameEn": "টুকের বাজার"
              },
              {
                "name": "টুলটিকর ইউনিয়ন",
                "nameEn": "টুলটিকর"
              },
              {
                "name": "মোগলগাঁও ইউনিয়ন",
                "nameEn": "মোগলগাঁও"
              },
              {
                "name": "হাটখোলা ইউনিয়ন",
                "nameEn": "হাটখোলা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বালাগঞ্জ উপজেলা",
            "nameEn": "Beanibazar",
            "unions": [
              {
                "name": "পূর্ব পৈলনপুর ইউনিয়ন",
                "nameEn": "পূর্ব পৈলনপুর"
              },
              {
                "name": "বোয়ালজুড় ইউনিয়ন",
                "nameEn": "বোয়ালজুড়"
              },
              {
                "name": "দেওয়ানবাজার ইউনিয়ন",
                "nameEn": "দেওয়ানবাজার"
              },
              {
                "name": "পশ্চিম গৌরীপুর ইউনিয়ন",
                "nameEn": "পশ্চিম গৌরীপুর"
              },
              {
                "name": "বালাগঞ্জ ইউনিয়ন",
                "nameEn": "বালাগঞ্জ"
              },
              {
                "name": "পূর্ব গৌরীপুর ইউনিয়ন",
                "nameEn": "পূর্ব গৌরীপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বিয়ানীবাজার উপজেলা",
            "nameEn": "Biswanath",
            "unions": [
              {
                "name": "আলীনগর ইউনিয়ন",
                "nameEn": "আলীনগর"
              },
              {
                "name": "কুড়ারবাজার ইউনিয়ন",
                "nameEn": "কুড়ারবাজার"
              },
              {
                "name": "চরখাই ইউনিয়ন",
                "nameEn": "চরখাই"
              },
              {
                "name": "দুবাগ ইউনিয়ন",
                "nameEn": "দুবাগ"
              },
              {
                "name": "মাথিউরা ইউনিয়ন",
                "nameEn": "মাথিউরা"
              },
              {
                "name": "তিলপাড়া ইউনিয়ন",
                "nameEn": "তিলপাড়া"
              },
              {
                "name": "মুড়িয়া ইউনিয়ন",
                "nameEn": "মুড়িয়া"
              },
              {
                "name": "মোল্লাপুর ইউনিয়ন",
                "nameEn": "মোল্লাপুর"
              },
              {
                "name": "লাউতা ইউনিয়ন",
                "nameEn": "লাউতা"
              },
              {
                "name": "শেওলা ইউনিয়ন",
                "nameEn": "শেওলা"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "বিশ্বনাথ উপজেলা",
            "nameEn": "Companiganj",
            "unions": [
              {
                "name": "লামাকাজী ইউনিয়ন",
                "nameEn": "লামাকাজী"
              },
              {
                "name": "খাজাঞ্চী ইউনিয়ন",
                "nameEn": "খাজাঞ্চী"
              },
              {
                "name": "অলংকারী ইউনিয়ন",
                "nameEn": "অলংকারী"
              },
              {
                "name": "রামপাশা ইউনিয়ন",
                "nameEn": "রামপাশা"
              },
              {
                "name": "দৌলতপুর ইউনিয়ন",
                "nameEn": "দৌলতপুর"
              },
              {
                "name": "বিশ্বনাথ ইউনিয়ন",
                "nameEn": "বিশ্বনাথ"
              },
              {
                "name": "দেওকলস ইউনিয়ন",
                "nameEn": "দেওকলস"
              },
              {
                "name": "দশঘর ইউনিয়ন",
                "nameEn": "দশঘর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কোম্পানীগঞ্জ উপজেলা",
            "nameEn": "Dakshin Surma",
            "unions": [
              {
                "name": "ইসলামপুর পশ্চিম ইউনিয়ন",
                "nameEn": "ইসলামপুর পশ্চিম"
              },
              {
                "name": "ইসলামপুর পূর্ব ইউনিয়ন",
                "nameEn": "ইসলামপুর পূর্ব"
              },
              {
                "name": "তেলিখাল ইউনিয়ন",
                "nameEn": "তেলিখাল"
              },
              {
                "name": "ইছাকলস ইউনিয়ন",
                "nameEn": "ইছাকলস"
              },
              {
                "name": "উত্তর রণিখাই ইউনিয়ন",
                "nameEn": "উত্তর রণিখাই"
              },
              {
                "name": "দক্ষিণ রণিখাই ইউনিয়ন",
                "nameEn": "দক্ষিণ রণিখাই"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ফেঞ্চুগঞ্জ উপজেলা",
            "nameEn": "Fenchuganj",
            "unions": [
              {
                "name": "ফেঞ্চুগঞ্জ ইউনিয়ন",
                "nameEn": "ফেঞ্চুগঞ্জ"
              },
              {
                "name": "মাইজগাঁও ইউনিয়ন",
                "nameEn": "মাইজগাঁও"
              },
              {
                "name": "ঘিলাছড়া ইউনিয়ন",
                "nameEn": "ঘিলাছড়া"
              },
              {
                "name": "উত্তর কুশিয়ারা ইউনিয়ন",
                "nameEn": "উত্তর কুশিয়ারা"
              },
              {
                "name": "উত্তর ফেঞ্চুগঞ্জ ইউনিয়ন",
                "nameEn": "উত্তর ফেঞ্চুগঞ্জ"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "গোলাপগঞ্জ উপজেলা",
            "nameEn": "Golapganj",
            "unions": [
              {
                "name": "বাঘা ইউনিয়ন",
                "nameEn": "বাঘা"
              },
              {
                "name": "গোলাপগঞ্জ ইউনিয়ন",
                "nameEn": "গোলাপগঞ্জ"
              },
              {
                "name": "ফুলবাড়ী ইউনিয়ন",
                "nameEn": "ফুলবাড়ী"
              },
              {
                "name": "লক্ষ্মীপাশা ইউনিয়ন",
                "nameEn": "লক্ষ্মীপাশা"
              },
              {
                "name": "ঢাকাদক্ষিণ ইউনিয়ন",
                "nameEn": "ঢাকাদক্ষিণ"
              },
              {
                "name": "লক্ষণাবন্দ ইউনিয়ন",
                "nameEn": "লক্ষণাবন্দ"
              },
              {
                "name": "ভাদেশ্বর ইউনিয়ন",
                "nameEn": "ভাদেশ্বর"
              },
              {
                "name": "পশ্চিম আমুড়া ইউনিয়ন",
                "nameEn": "পশ্চিম আমুড়া"
              },
              {
                "name": "উত্তর বাদেপাশা ইউনিয়ন",
                "nameEn": "উত্তর বাদেপাশা"
              },
              {
                "name": "শরীফগঞ্জ ইউনিয়ন",
                "nameEn": "শরীফগঞ্জ"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "গোয়াইনঘাট উপজেলা",
            "nameEn": "Gowainghat",
            "unions": [
              {
                "name": "রুস্তমপুর ইউনিয়ন",
                "nameEn": "রুস্তমপুর"
              },
              {
                "name": "পশ্চিম জাফলং ইউনিয়ন",
                "nameEn": "পশ্চিম জাফলং"
              },
              {
                "name": "পুর্ব জাফলং ইউনিয়ন",
                "nameEn": "পুর্ব জাফলং"
              },
              {
                "name": "লেঙ্গুঁড়া ইউনিয়ন",
                "nameEn": "লেঙ্গুঁড়া"
              },
              {
                "name": "আলীরগাঁও ইউনিয়ন",
                "nameEn": "আলীরগাঁও"
              },
              {
                "name": "ফতেপুর ইউনিয়ন",
                "nameEn": "ফতেপুর"
              },
              {
                "name": "নন্দিরগাঁও ইউনিয়ন",
                "nameEn": "নন্দিরগাঁও"
              },
              {
                "name": "তোয়াকুল ইউনিয়ন",
                "nameEn": "তোয়াকুল"
              },
              {
                "name": "ডৌবাড়ী ইউনিয়ন",
                "nameEn": "ডৌবাড়ী"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "জৈন্তাপুর উপজেলা",
            "nameEn": "Jointiapur",
            "unions": [
              {
                "name": "নিজপাট ইউনিয়ন",
                "nameEn": "নিজপাট"
              },
              {
                "name": "জৈন্তাপুর ইউনিয়ন",
                "nameEn": "জৈন্তাপুর"
              },
              {
                "name": "চারিকাটা ইউনিয়ন",
                "nameEn": "চারিকাটা"
              },
              {
                "name": "দরবস্ত ইউনিয়ন",
                "nameEn": "দরবস্ত"
              },
              {
                "name": "ফতেহপুর ইউনিয়ন",
                "nameEn": "ফতেহপুর"
              },
              {
                "name": "চিকনাগুল ইউনিয়ন",
                "nameEn": "চিকনাগুল"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "কানাইঘাট উপজেলা",
            "nameEn": "Kanaighat",
            "unions": [
              {
                "name": "পূর্ব লক্ষ্মীপ্রাসাদ ইউনিয়ন",
                "nameEn": "পূর্ব লক্ষ্মীপ্রাসাদ"
              },
              {
                "name": "পশ্চিম লক্ষ্মীপ্রাসাদ ইউনিয়ন",
                "nameEn": "পশ্চিম লক্ষ্মীপ্রাসাদ"
              },
              {
                "name": "পূর্ব দিঘীরপার ইউনিয়ন",
                "nameEn": "পূর্ব দিঘীরপার"
              },
              {
                "name": "সাতবাঁক ইউনিয়ন",
                "nameEn": "সাতবাঁক"
              },
              {
                "name": "বড়চতুল ইউনিয়ন",
                "nameEn": "বড়চতুল"
              },
              {
                "name": "কানাইঘাট ইউনিয়ন",
                "nameEn": "কানাইঘাট"
              },
              {
                "name": "দক্ষিণ বাণীগ্রাম ইউনিয়ন",
                "nameEn": "দক্ষিণ বাণীগ্রাম"
              },
              {
                "name": "ঝিঙ্গাবাড়ী ইউনিয়ন",
                "nameEn": "ঝিঙ্গাবাড়ী"
              },
              {
                "name": "রাজাগঞ্জ ইউনিয়ন",
                "nameEn": "রাজাগঞ্জ"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "জকিগঞ্জ উপজেলা",
            "nameEn": "Osmaninagar",
            "unions": [
              {
                "name": "বারহাল ইউনিয়ন",
                "nameEn": "বারহাল"
              },
              {
                "name": "বীরশ্রী ইউনিয়ন",
                "nameEn": "বীরশ্রী"
              },
              {
                "name": "কাজলসার ইউনিয়ন",
                "nameEn": "কাজলসার"
              },
              {
                "name": "খলাছড়া ইউনিয়ন",
                "nameEn": "খলাছড়া"
              },
              {
                "name": "জকিগঞ্জ সদর ইউনিয়ন",
                "nameEn": "জকিগঞ্জ সদর"
              },
              {
                "name": "সুলতানপুর ইউনিয়ন",
                "nameEn": "সুলতানপুর"
              },
              {
                "name": "বারঠাকুরী ইউনিয়ন",
                "nameEn": "বারঠাকুরী"
              },
              {
                "name": "কসকনকপুর ইউনিয়ন",
                "nameEn": "কসকনকপুর"
              },
              {
                "name": "মানিকপুর ইউনিয়ন",
                "nameEn": "মানিকপুর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "দক্ষিণ সুরমা উপজেলা",
            "nameEn": "Sylhet Sadar",
            "unions": [
              {
                "name": "মোল্লারগাঁও ইউনিয়ন",
                "nameEn": "মোল্লারগাঁও"
              },
              {
                "name": "বরইকান্দি ইউনিয়ন",
                "nameEn": "বরইকান্দি"
              },
              {
                "name": "তেতলী ইউনিয়ন",
                "nameEn": "তেতলী"
              },
              {
                "name": "কুচাই ইউনিয়ন",
                "nameEn": "কুচাই"
              },
              {
                "name": "সিলাম ইউনিয়ন",
                "nameEn": "সিলাম"
              },
              {
                "name": "লালাবাজার ইউনিয়ন",
                "nameEn": "লালাবাজার"
              },
              {
                "name": "জালালপুর ইউনিয়ন",
                "nameEn": "জালালপুর"
              },
              {
                "name": "মোগলাবাজার ইউনিয়ন",
                "nameEn": "মোগলাবাজার"
              },
              {
                "name": "দাউদপুর ইউনিয়ন",
                "nameEn": "দাউদপুর"
              },
              {
                "name": "কামালবাজার ইউনিয়ন",
                "nameEn": "কামালবাজার"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "ওসমানীনগর উপজেলা",
            "nameEn": "Zakiganj",
            "unions": [
              {
                "name": "উমরপুর ইউনিয়ন",
                "nameEn": "উমরপুর"
              },
              {
                "name": "তাজপুর ইউনিয়ন",
                "nameEn": "তাজপুর"
              },
              {
                "name": "পশ্চিম পৈলনপুর ইউনিয়ন",
                "nameEn": "পশ্চিম পৈলনপুর"
              },
              {
                "name": "বুরুঙ্গাবাজার ইউনিয়ন",
                "nameEn": "বুরুঙ্গাবাজার"
              },
              {
                "name": "গোয়ালাবাজার ইউনিয়ন",
                "nameEn": "গোয়ালাবাজার"
              },
              {
                "name": "সাদীপুর ইউনিয়ন",
                "nameEn": "সাদীপুর"
              },
              {
                "name": "উসমানপুর ইউনিয়ন",
                "nameEn": "উসমানপুর"
              },
              {
                "name": "দয়ামীর ইউনিয়ন",
                "nameEn": "দয়ামীর"
              }
            ],
            "type": "upazila"
          },
          {
            "name": "Beanibazar পৌরসভা",
            "nameEn": "Beanibazar Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Bishwanath পৌরসভা",
            "nameEn": "Bishwanath Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Companiganj পৌরসভা",
            "nameEn": "Companiganj Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Golapganj পৌরসভা",
            "nameEn": "Golapganj Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Gowainghat পৌরসভা",
            "nameEn": "Gowainghat Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Jaintiapur পৌরসভা",
            "nameEn": "Jaintiapur Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Kanaighat পৌরসভা",
            "nameEn": "Kanaighat Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Zakiganj পৌরসভা",
            "nameEn": "Zakiganj Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Balaganj পৌরসভা",
            "nameEn": "Balaganj Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Fenchuganj পৌরসভা",
            "nameEn": "Fenchuganj Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          },
          {
            "name": "Osmaninagar পৌরসভা",
            "nameEn": "Osmaninagar Pourashava",
            "unions": [
              {
                "name": "ওয়ার্ড নং-1",
                "nameEn": "Ward No-1"
              },
              {
                "name": "ওয়ার্ড নং-2",
                "nameEn": "Ward No-2"
              },
              {
                "name": "ওয়ার্ড নং-3",
                "nameEn": "Ward No-3"
              },
              {
                "name": "ওয়ার্ড নং-4",
                "nameEn": "Ward No-4"
              },
              {
                "name": "ওয়ার্ড নং-5",
                "nameEn": "Ward No-5"
              },
              {
                "name": "ওয়ার্ড নং-6",
                "nameEn": "Ward No-6"
              },
              {
                "name": "ওয়ার্ড নং-7",
                "nameEn": "Ward No-7"
              },
              {
                "name": "ওয়ার্ড নং-8",
                "nameEn": "Ward No-8"
              },
              {
                "name": "ওয়ার্ড নং-9",
                "nameEn": "Ward No-9"
              }
            ],
            "type": "municipality"
          }
        ]
      }
    ]
  }
];
