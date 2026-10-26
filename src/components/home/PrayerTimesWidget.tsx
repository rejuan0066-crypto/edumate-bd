import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePrayerCalendarSettings } from '@/hooks/usePrayerCalendarSettings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin } from 'lucide-react';

const COUNTRIES = [
  { en: 'Bangladesh', bn: 'বাংলাদেশ', code: 'BD' },
  { en: 'Saudi Arabia', bn: 'সৌদি আরব', code: 'SA' },
  { en: 'India', bn: 'ভারত', code: 'IN' },
  { en: 'Pakistan', bn: 'পাকিস্তান', code: 'PK' },
  { en: 'UAE', bn: 'সংযুক্ত আরব আমিরাত', code: 'AE' },
  { en: 'Malaysia', bn: 'মালয়েশিয়া', code: 'MY' },
  { en: 'Indonesia', bn: 'ইন্দোনেশিয়া', code: 'ID' },
  { en: 'Turkey', bn: 'তুরস্ক', code: 'TR' },
  { en: 'Egypt', bn: 'মিশর', code: 'EG' },
  { en: 'Qatar', bn: 'কাতার', code: 'QA' },
  { en: 'Kuwait', bn: 'কুয়েত', code: 'KW' },
  { en: 'Oman', bn: 'ওমান', code: 'OM' },
  { en: 'Bahrain', bn: 'বাহরাইন', code: 'BH' },
  { en: 'UK', bn: 'যুক্তরাজ্য', code: 'GB' },
  { en: 'USA', bn: 'যুক্তরাষ্ট্র', code: 'US' },
];

type City = { en: string; bn: string; upazilas?: { en: string; bn: string }[] };
const BD_DIVISIONS: Record<string, { en: string; bn: string; cities: City[] }> = {
  dhaka: { en: 'Dhaka', bn: 'ঢাকা', cities: [
    { en: 'Dhaka', bn: 'ঢাকা', upazilas: [{en:'Dhamrai',bn:'ধামরাই'},{en:'Dohar',bn:'দোহার'},{en:'Keraniganj',bn:'কেরানীগঞ্জ'},{en:'Nawabganj',bn:'নবাবগঞ্জ'},{en:'Savar',bn:'সাভার'}] },
    { en: 'Gazipur', bn: 'গাজীপুর', upazilas: [{en:'Kaliakair',bn:'কালিয়াকৈর'},{en:'Kaliganj',bn:'কালীগঞ্জ'},{en:'Kapasia',bn:'কাপাসিয়া'},{en:'Sreepur',bn:'শ্রীপুর'},{en:'Tongi',bn:'টঙ্গী'}] },
    { en: 'Narayanganj', bn: 'নারায়ণগঞ্জ', upazilas: [{en:'Araihazar',bn:'আড়াইহাজার'},{en:'Bandar',bn:'বন্দর'},{en:'Rupganj',bn:'রূপগঞ্জ'},{en:'Sonargaon',bn:'সোনারগাঁও'}] },
    { en: 'Tangail', bn: 'টাঙ্গাইল', upazilas: [{en:'Basail',bn:'বাসাইল'},{en:'Bhuapur',bn:'ভূঞাপুর'},{en:'Delduar',bn:'দেলদুয়ার'},{en:'Ghatail',bn:'ঘাটাইল'},{en:'Gopalpur',bn:'গোপালপুর'},{en:'Kalihati',bn:'কালিহাতী'},{en:'Madhupur',bn:'মধুপুর'},{en:'Mirzapur',bn:'মির্জাপুর'},{en:'Nagarpur',bn:'নাগরপুর'},{en:'Sakhipur',bn:'সখিপুর'}] },
    { en: 'Manikganj', bn: 'মানিকগঞ্জ', upazilas: [{en:'Daulatpur',bn:'দৌলতপুর'},{en:'Ghior',bn:'ঘিওর'},{en:'Harirampur',bn:'হরিরামপুর'},{en:'Saturia',bn:'সাটুরিয়া'},{en:'Shibalaya',bn:'শিবালয়'},{en:'Singair',bn:'সিংগাইর'}] },
    { en: 'Munshiganj', bn: 'মুন্সীগঞ্জ', upazilas: [{en:'Gazaria',bn:'গজারিয়া'},{en:'Lohajang',bn:'লৌহজং'},{en:'Sirajdikhan',bn:'সিরাজদিখান'},{en:'Sreenagar',bn:'শ্রীনগর'},{en:'Tongibari',bn:'টংগীবাড়ি'}] },
    { en: 'Narsingdi', bn: 'নরসিংদী', upazilas: [{en:'Belabo',bn:'বেলাবো'},{en:'Monohardi',bn:'মনোহরদী'},{en:'Palash',bn:'পলাশ'},{en:'Raipura',bn:'রায়পুরা'},{en:'Shibpur',bn:'শিবপুর'}] },
    { en: 'Faridpur', bn: 'ফরিদপুর', upazilas: [{en:'Alfadanga',bn:'আলফাডাঙ্গা'},{en:'Bhanga',bn:'ভাঙ্গা'},{en:'Boalmari',bn:'বোয়ালমারী'},{en:'Charbhadrasan',bn:'চরভদ্রাসন'},{en:'Madhukhali',bn:'মধুখালী'},{en:'Nagarkanda',bn:'নগরকান্দা'},{en:'Sadarpur',bn:'সদরপুর'},{en:'Saltha',bn:'সালথা'}] },
    { en: 'Kishoreganj', bn: 'কিশোরগঞ্জ', upazilas: [{en:'Bajitpur',bn:'বাজিতপুর'},{en:'Bhairab',bn:'ভৈরব'},{en:'Hossainpur',bn:'হোসেনপুর'},{en:'Karimganj',bn:'করিমগঞ্জ'},{en:'Katiadi',bn:'কটিয়াদী'},{en:'Kuliarchar',bn:'কুলিয়ারচর'},{en:'Pakundia',bn:'পাকুন্দিয়া'},{en:'Tarail',bn:'তাড়াইল'}] },
    { en: 'Rajbari', bn: 'রাজবাড়ী', upazilas: [{en:'Baliakandi',bn:'বালিয়াকান্দি'},{en:'Goalandaghat',bn:'গোয়ালন্দ'},{en:'Pangsha',bn:'পাংশা'}] },
    { en: 'Shariatpur', bn: 'শরীয়তপুর', upazilas: [{en:'Bhedarganj',bn:'ভেদরগঞ্জ'},{en:'Damudya',bn:'ডামুড্যা'},{en:'Gosairhat',bn:'গোসাইরহাট'},{en:'Naria',bn:'নড়িয়া'},{en:'Zajira',bn:'জাজিরা'}] },
    { en: 'Madaripur', bn: 'মাদারীপুর', upazilas: [{en:'Kalkini',bn:'কালকিনি'},{en:'Rajoir',bn:'রাজৈর'},{en:'Shibchar',bn:'শিবচর'}] },
    { en: 'Gopalganj', bn: 'গোপালগঞ্জ', upazilas: [{en:'Kashiani',bn:'কাশিয়ানী'},{en:'Kotalipara',bn:'কোটালীপাড়া'},{en:'Muksudpur',bn:'মুকসুদপুর'},{en:'Tungipara',bn:'টুঙ্গিপাড়া'}] },
  ]},
  chittagong: { en: 'Chittagong', bn: 'চট্টগ্রাম', cities: [
    { en: 'Chittagong', bn: 'চট্টগ্রাম', upazilas: [{en:'Anwara',bn:'আনোয়ারা'},{en:'Banshkhali',bn:'বাঁশখালী'},{en:'Boalkhali',bn:'বোয়ালখালী'},{en:'Chandanaish',bn:'চন্দনাইশ'},{en:'Fatikchhari',bn:'ফটিকছড়ি'},{en:'Hathazari',bn:'হাটহাজারী'},{en:'Lohagara',bn:'লোহাগাড়া'},{en:'Mirsharai',bn:'মিরসরাই'},{en:'Patiya',bn:'পটিয়া'},{en:'Rangunia',bn:'রাঙ্গুনিয়া'},{en:'Raozan',bn:'রাউজান'},{en:'Sandwip',bn:'সন্দ্বীপ'},{en:'Satkania',bn:'সাতকানিয়া'},{en:'Sitakunda',bn:'সীতাকুণ্ড'}] },
    { en: 'Comilla', bn: 'কুমিল্লা', upazilas: [{en:'Barura',bn:'বরুড়া'},{en:'Brahmanpara',bn:'ব্রাহ্মণপাড়া'},{en:'Burichang',bn:'বুড়িচং'},{en:'Chandina',bn:'চান্দিনা'},{en:'Chauddagram',bn:'চৌদ্দগ্রাম'},{en:'Daudkandi',bn:'দাউদকান্দি'},{en:'Debidwar',bn:'দেবিদ্বার'},{en:'Homna',bn:'হোমনা'},{en:'Laksam',bn:'লাকসাম'},{en:'Meghna',bn:'মেঘনা'},{en:'Muradnagar',bn:'মুরাদনগর'},{en:'Nangalkot',bn:'নাঙ্গলকোট'},{en:'Titas',bn:'তিতাস'}] },
    { en: "Cox's Bazar", bn: 'কক্সবাজার', upazilas: [{en:'Chakaria',bn:'চকরিয়া'},{en:'Kutubdia',bn:'কুতুবদিয়া'},{en:'Maheshkhali',bn:'মহেশখালী'},{en:'Pekua',bn:'পেকুয়া'},{en:'Ramu',bn:'রামু'},{en:'Teknaf',bn:'টেকনাফ'},{en:'Ukhia',bn:'উখিয়া'}] },
    { en: 'Brahmanbaria', bn: 'ব্রাহ্মণবাড়িয়া', upazilas: [{en:'Akhaura',bn:'আখাউড়া'},{en:'Ashuganj',bn:'আশুগঞ্জ'},{en:'Bancharampur',bn:'বাঞ্ছারামপুর'},{en:'Bijoynagar',bn:'বিজয়নগর'},{en:'Kasba',bn:'কসবা'},{en:'Nabinagar',bn:'নবীনগর'},{en:'Nasirnagar',bn:'নাসিরনগর'},{en:'Sarail',bn:'সরাইল'}] },
    { en: 'Noakhali', bn: 'নোয়াখালী', upazilas: [{en:'Begumganj',bn:'বেগমগঞ্জ'},{en:'Chatkhil',bn:'চাটখিল'},{en:'Companiganj',bn:'কোম্পানীগঞ্জ'},{en:'Hatiya',bn:'হাতিয়া'},{en:'Kabirhat',bn:'কবিরহাট'},{en:'Senbagh',bn:'সেনবাগ'},{en:'Sonaimuri',bn:'সোনাইমুড়ী'},{en:'Subarnachar',bn:'সুবর্ণচর'}] },
    { en: 'Feni', bn: 'ফেনী', upazilas: [{en:'Chhagalnaiya',bn:'ছাগলনাইয়া'},{en:'Daganbhuiyan',bn:'দাগনভূঞা'},{en:'Fulgazi',bn:'ফুলগাজী'},{en:'Parshuram',bn:'পরশুরাম'},{en:'Sonagazi',bn:'সোনাগাজী'}] },
    { en: 'Chandpur', bn: 'চাঁদপুর', upazilas: [{en:'Faridganj',bn:'ফরিদগঞ্জ'},{en:'Haimchar',bn:'হাইমচর'},{en:'Haziganj',bn:'হাজীগঞ্জ'},{en:'Kachua',bn:'কচুয়া'},{en:'Matlab Dakshin',bn:'মতলব দক্ষিণ'},{en:'Matlab Uttar',bn:'মতলব উত্তর'},{en:'Shahrasti',bn:'শাহরাস্তি'}] },
    { en: 'Lakshmipur', bn: 'লক্ষ্মীপুর', upazilas: [{en:'Kamalnagar',bn:'কমলনগর'},{en:'Raipur',bn:'রায়পুর'},{en:'Ramganj',bn:'রামগঞ্জ'},{en:'Ramgati',bn:'রামগতি'}] },
    { en: 'Rangamati', bn: 'রাঙ্গামাটি', upazilas: [{en:'Baghaichari',bn:'বাঘাইছড়ি'},{en:'Barkal',bn:'বরকল'},{en:'Belaichari',bn:'বিলাইছড়ি'},{en:'Juraichari',bn:'জুরাছড়ি'},{en:'Kaptai',bn:'কাপ্তাই'},{en:'Kawkhali',bn:'কাউখালী'},{en:'Langadu',bn:'লংগদু'},{en:'Naniarchar',bn:'নানিয়ারচর'},{en:'Rajasthali',bn:'রাজস্থলী'}] },
    { en: 'Bandarban', bn: 'বান্দরবান', upazilas: [{en:'Alikadam',bn:'আলীকদম'},{en:'Lama',bn:'লামা'},{en:'Naikhongchhari',bn:'নাইক্ষ্যংছড়ি'},{en:'Rowangchhari',bn:'রোয়াংছড়ি'},{en:'Ruma',bn:'রুমা'},{en:'Thanchi',bn:'থানচি'}] },
    { en: 'Khagrachhari', bn: 'খাগড়াছড়ি', upazilas: [{en:'Dighinala',bn:'দীঘিনালা'},{en:'Lakshmichhari',bn:'লক্ষ্মীছড়ি'},{en:'Mahalchhari',bn:'মহালছড়ি'},{en:'Manikchhari',bn:'মানিকছড়ি'},{en:'Matiranga',bn:'মাটিরাঙ্গা'},{en:'Panchhari',bn:'পানছড়ি'},{en:'Ramgarh',bn:'রামগড়'}] },
  ]},
  sylhet: { en: 'Sylhet', bn: 'সিলেট', cities: [
    { en: 'Sylhet', bn: 'সিলেট', upazilas: [{en:'Balaganj',bn:'বালাগঞ্জ'},{en:'Beanibazar',bn:'বিয়ানীবাজার'},{en:'Bishwanath',bn:'বিশ্বনাথ'},{en:'Companiganj',bn:'কোম্পানীগঞ্জ'},{en:'Dakshin Surma',bn:'দক্ষিণ সুরমা'},{en:'Fenchuganj',bn:'ফেঞ্চুগঞ্জ'},{en:'Golapganj',bn:'গোলাপগঞ্জ'},{en:'Gowainghat',bn:'গোয়াইনঘাট'},{en:'Jaintiapur',bn:'জৈন্তাপুর'},{en:'Kanaighat',bn:'কানাইঘাট'},{en:'Osmani Nagar',bn:'ওসমানীনগর'},{en:'Zakiganj',bn:'জকিগঞ্জ'}] },
    { en: 'Moulvibazar', bn: 'মৌলভীবাজার', upazilas: [{en:'Barlekha',bn:'বড়লেখা'},{en:'Juri',bn:'জুড়ী'},{en:'Kamalganj',bn:'কমলগঞ্জ'},{en:'Kulaura',bn:'কুলাউড়া'},{en:'Rajnagar',bn:'রাজনগর'},{en:'Sreemangal',bn:'শ্রীমঙ্গল'}] },
    { en: 'Habiganj', bn: 'হবিগঞ্জ', upazilas: [{en:'Ajmiriganj',bn:'আজমিরীগঞ্জ'},{en:'Bahubal',bn:'বাহুবল'},{en:'Baniachong',bn:'বানিয়াচং'},{en:'Chunarughat',bn:'চুনারুঘাট'},{en:'Lakhai',bn:'লাখাই'},{en:'Madhabpur',bn:'মাধবপুর'},{en:'Nabiganj',bn:'নবীগঞ্জ'},{en:'Shaistaganj',bn:'শায়েস্তাগঞ্জ'}] },
    { en: 'Sunamganj', bn: 'সুনামগঞ্জ', upazilas: [{en:'Bishwambharpur',bn:'বিশ্বম্ভরপুর'},{en:'Chhatak',bn:'ছাতক'},{en:'Derai',bn:'দিরাই'},{en:'Dharmapasha',bn:'ধর্মপাশা'},{en:'Dowarabazar',bn:'দোয়ারাবাজার'},{en:'Jagannathpur',bn:'জগন্নাথপুর'},{en:'Jamalganj',bn:'জামালগঞ্জ'},{en:'Sullah',bn:'শাল্লা'},{en:'Tahirpur',bn:'তাহিরপুর'}] },
  ]},
  rajshahi: { en: 'Rajshahi', bn: 'রাজশাহী', cities: [
    { en: 'Rajshahi', bn: 'রাজশাহী', upazilas: [{en:'Bagha',bn:'বাঘা'},{en:'Bagmara',bn:'বাগমারা'},{en:'Charghat',bn:'চারঘাট'},{en:'Durgapur',bn:'দুর্গাপুর'},{en:'Godagari',bn:'গোদাগাড়ী'},{en:'Mohanpur',bn:'মোহনপুর'},{en:'Paba',bn:'পবা'},{en:'Puthia',bn:'পুঠিয়া'},{en:'Tanore',bn:'তানোর'}] },
    { en: 'Bogra', bn: 'বগুড়া', upazilas: [{en:'Adamdighi',bn:'আদমদীঘি'},{en:'Dhunat',bn:'ধুনট'},{en:'Dhupchanchia',bn:'দুপচাঁচিয়া'},{en:'Gabtali',bn:'গাবতলী'},{en:'Kahaloo',bn:'কাহালু'},{en:'Nandigram',bn:'নন্দীগ্রাম'},{en:'Sariakandi',bn:'সারিয়াকান্দি'},{en:'Shahjahanpur',bn:'শাজাহানপুর'},{en:'Sherpur',bn:'শেরপুর'},{en:'Shibganj',bn:'শিবগঞ্জ'},{en:'Sonatala',bn:'সোনাতলা'}] },
    { en: 'Pabna', bn: 'পাবনা', upazilas: [{en:'Atgharia',bn:'আটঘরিয়া'},{en:'Bera',bn:'বেড়া'},{en:'Bhangura',bn:'ভাঙ্গুড়া'},{en:'Chatmohar',bn:'চাটমোহর'},{en:'Faridpur',bn:'ফরিদপুর'},{en:'Ishwardi',bn:'ঈশ্বরদী'},{en:'Santhia',bn:'সাঁথিয়া'},{en:'Sujanagar',bn:'সুজানগর'}] },
    { en: 'Natore', bn: 'নাটোর', upazilas: [{en:'Bagatipara',bn:'বাগাতিপাড়া'},{en:'Baraigram',bn:'বড়াইগ্রাম'},{en:'Gurudaspur',bn:'গুরুদাসপুর'},{en:'Lalpur',bn:'লালপুর'},{en:'Naldanga',bn:'নলডাঙ্গা'},{en:'Singra',bn:'সিংড়া'}] },
    { en: 'Naogaon', bn: 'নওগাঁ', upazilas: [{en:'Atrai',bn:'আত্রাই'},{en:'Badalgachhi',bn:'বদলগাছী'},{en:'Dhamoirhat',bn:'ধামইরহাট'},{en:'Manda',bn:'মান্দা'},{en:'Mahadebpur',bn:'মহাদেবপুর'},{en:'Niamatpur',bn:'নিয়ামতপুর'},{en:'Patnitala',bn:'পত্নীতলা'},{en:'Porsha',bn:'পোরশা'},{en:'Raninagar',bn:'রাণীনগর'},{en:'Sapahar',bn:'সাপাহার'}] },
    { en: 'Chapainawabganj', bn: 'চাঁপাইনবাবগঞ্জ', upazilas: [{en:'Bholahat',bn:'ভোলাহাট'},{en:'Gomastapur',bn:'গোমস্তাপুর'},{en:'Nachole',bn:'নাচোল'},{en:'Shibganj',bn:'শিবগঞ্জ'}] },
    { en: 'Joypurhat', bn: 'জয়পুরহাট', upazilas: [{en:'Akkelpur',bn:'আক্কেলপুর'},{en:'Kalai',bn:'কালাই'},{en:'Khetlal',bn:'ক্ষেতলাল'},{en:'Panchbibi',bn:'পাঁচবিবি'}] },
    { en: 'Sirajganj', bn: 'সিরাজগঞ্জ', upazilas: [{en:'Belkuchi',bn:'বেলকুচি'},{en:'Chauhali',bn:'চৌহালী'},{en:'Kamarkhanda',bn:'কামারখন্দ'},{en:'Kazipur',bn:'কাজীপুর'},{en:'Raiganj',bn:'রায়গঞ্জ'},{en:'Shahjadpur',bn:'শাহজাদপুর'},{en:'Tarash',bn:'তাড়াশ'},{en:'Ullahpara',bn:'উল্লাপাড়া'}] },
  ]},
  khulna: { en: 'Khulna', bn: 'খুলনা', cities: [
    { en: 'Khulna', bn: 'খুলনা', upazilas: [{en:'Batiaghata',bn:'বটিয়াঘাটা'},{en:'Dacope',bn:'দাকোপ'},{en:'Dighalia',bn:'দিঘলিয়া'},{en:'Dumuria',bn:'ডুমুরিয়া'},{en:'Koyra',bn:'কয়রা'},{en:'Paikgachha',bn:'পাইকগাছা'},{en:'Phultala',bn:'ফুলতলা'},{en:'Rupsa',bn:'রূপসা'},{en:'Terokhada',bn:'তেরখাদা'}] },
    { en: 'Jessore', bn: 'যশোর', upazilas: [{en:'Abhaynagar',bn:'অভয়নগর'},{en:'Bagherpara',bn:'বাঘারপাড়া'},{en:'Chaugachha',bn:'চৌগাছা'},{en:'Jhikargachha',bn:'ঝিকরগাছা'},{en:'Keshabpur',bn:'কেশবপুর'},{en:'Manirampur',bn:'মণিরামপুর'},{en:'Sharsha',bn:'শার্শা'}] },
    { en: 'Satkhira', bn: 'সাতক্ষীরা', upazilas: [{en:'Assasuni',bn:'আশাশুনি'},{en:'Debhata',bn:'দেবহাটা'},{en:'Kalaroa',bn:'কলারোয়া'},{en:'Kaliganj',bn:'কালীগঞ্জ'},{en:'Shyamnagar',bn:'শ্যামনগর'},{en:'Tala',bn:'তালা'}] },
    { en: 'Kushtia', bn: 'কুষ্টিয়া', upazilas: [{en:'Bheramara',bn:'ভেড়ামারা'},{en:'Daulatpur',bn:'দৌলতপুর'},{en:'Khoksa',bn:'খোকসা'},{en:'Kumarkhali',bn:'কুমারখালী'},{en:'Mirpur',bn:'মিরপুর'}] },
    { en: 'Bagerhat', bn: 'বাগেরহাট', upazilas: [{en:'Chitalmari',bn:'চিতলমারী'},{en:'Fakirhat',bn:'ফকিরহাট'},{en:'Kachua',bn:'কচুয়া'},{en:'Mollahat',bn:'মোল্লাহাট'},{en:'Mongla',bn:'মোংলা'},{en:'Morrelganj',bn:'মোড়েলগঞ্জ'},{en:'Rampal',bn:'রামপাল'},{en:'Sarankhola',bn:'শরণখোলা'}] },
    { en: 'Chuadanga', bn: 'চুয়াডাঙ্গা', upazilas: [{en:'Alamdanga',bn:'আলমডাঙ্গা'},{en:'Damurhuda',bn:'দামুড়হুদা'},{en:'Jibannagar',bn:'জীবননগর'}] },
    { en: 'Jhenaidah', bn: 'ঝিনাইদহ', upazilas: [{en:'Harinakunda',bn:'হরিণাকুন্ডু'},{en:'Kaliganj',bn:'কালীগঞ্জ'},{en:'Kotchandpur',bn:'কোটচাঁদপুর'},{en:'Maheshpur',bn:'মহেশপুর'},{en:'Shailkupa',bn:'শৈলকুপা'}] },
    { en: 'Magura', bn: 'মাগুরা', upazilas: [{en:'Mohammadpur',bn:'মহম্মদপুর'},{en:'Shalikha',bn:'শালিখা'},{en:'Sreepur',bn:'শ্রীপুর'}] },
    { en: 'Meherpur', bn: 'মেহেরপুর', upazilas: [{en:'Gangni',bn:'গাংনী'},{en:'Mujibnagar',bn:'মুজিবনগর'}] },
    { en: 'Narail', bn: 'নড়াইল', upazilas: [{en:'Kalia',bn:'কালিয়া'},{en:'Lohagara',bn:'লোহাগড়া'}] },
  ]},
  barishal: { en: 'Barishal', bn: 'বরিশাল', cities: [
    { en: 'Barishal', bn: 'বরিশাল', upazilas: [{en:'Agailjhara',bn:'আগৈলঝাড়া'},{en:'Babuganj',bn:'বাবুগঞ্জ'},{en:'Bakerganj',bn:'বাকেরগঞ্জ'},{en:'Banaripara',bn:'বানারীপাড়া'},{en:'Gaurnadi',bn:'গৌরনদী'},{en:'Hizla',bn:'হিজলা'},{en:'Mehendiganj',bn:'মেহেন্দিগঞ্জ'},{en:'Muladi',bn:'মুলাদী'},{en:'Wazirpur',bn:'উজিরপুর'}] },
    { en: 'Patuakhali', bn: 'পটুয়াখালী', upazilas: [{en:'Bauphal',bn:'বাউফল'},{en:'Dashmina',bn:'দশমিনা'},{en:'Dumki',bn:'দুমকি'},{en:'Galachipa',bn:'গলাচিপা'},{en:'Kalapara',bn:'কলাপাড়া'},{en:'Mirzaganj',bn:'মির্জাগঞ্জ'},{en:'Rangabali',bn:'রাঙ্গাবালী'}] },
    { en: 'Bhola', bn: 'ভোলা', upazilas: [{en:'Borhanuddin',bn:'বোরহানউদ্দিন'},{en:'Char Fasson',bn:'চরফ্যাশন'},{en:'Daulatkhan',bn:'দৌলতখান'},{en:'Lalmohan',bn:'লালমোহন'},{en:'Manpura',bn:'মনপুরা'},{en:'Tazumuddin',bn:'তজুমদ্দিন'}] },
    { en: 'Pirojpur', bn: 'পিরোজপুর', upazilas: [{en:'Bhandaria',bn:'ভান্ডারিয়া'},{en:'Kawkhali',bn:'কাউখালী'},{en:'Mathbaria',bn:'মঠবাড়িয়া'},{en:'Nazirpur',bn:'নাজিরপুর'},{en:'Nesarabad',bn:'নেছারাবাদ'},{en:'Zianagar',bn:'জিয়ানগর'}] },
    { en: 'Barguna', bn: 'বরগুনা', upazilas: [{en:'Amtali',bn:'আমতলী'},{en:'Bamna',bn:'বামনা'},{en:'Betagi',bn:'বেতাগী'},{en:'Patharghata',bn:'পাথরঘাটা'},{en:'Taltali',bn:'তালতলী'}] },
    { en: 'Jhalokati', bn: 'ঝালকাঠি', upazilas: [{en:'Kathalia',bn:'কাঁঠালিয়া'},{en:'Nalchity',bn:'নলছিটি'},{en:'Rajapur',bn:'রাজাপুর'}] },
  ]},
  rangpur: { en: 'Rangpur', bn: 'রংপুর', cities: [
    { en: 'Rangpur', bn: 'রংপুর', upazilas: [{en:'Badarganj',bn:'বদরগঞ্জ'},{en:'Gangachara',bn:'গংগাচড়া'},{en:'Kaunia',bn:'কাউনিয়া'},{en:'Mithapukur',bn:'মিঠাপুকুর'},{en:'Pirgachha',bn:'পীরগাছা'},{en:'Pirganj',bn:'পীরগঞ্জ'},{en:'Taraganj',bn:'তারাগঞ্জ'}] },
    { en: 'Dinajpur', bn: 'দিনাজপুর', upazilas: [{en:'Birampur',bn:'বিরামপুর'},{en:'Birganj',bn:'বীরগঞ্জ'},{en:'Birol',bn:'বিরল'},{en:'Bochaganj',bn:'বোচাগঞ্জ'},{en:'Chirirbandar',bn:'চিরিরবন্দর'},{en:'Fulbari',bn:'ফুলবাড়ী'},{en:'Ghoraghat',bn:'ঘোড়াঘাট'},{en:'Hakimpur',bn:'হাকিমপুর'},{en:'Kaharole',bn:'কাহারোল'},{en:'Khansama',bn:'খানসামা'},{en:'Nawabganj',bn:'নবাবগঞ্জ'},{en:'Parbatipur',bn:'পার্বতীপুর'}] },
    { en: 'Kurigram', bn: 'কুড়িগ্রাম', upazilas: [{en:'Bhurungamari',bn:'ভুরুঙ্গামারী'},{en:'Chilmari',bn:'চিলমারী'},{en:'Phulbari',bn:'ফুলবাড়ী'},{en:'Nageshwari',bn:'নাগেশ্বরী'},{en:'Rajarhat',bn:'রাজারহাট'},{en:'Rajibpur',bn:'রাজীবপুর'},{en:'Raumari',bn:'রৌমারী'},{en:'Ulipur',bn:'উলিপুর'}] },
    { en: 'Thakurgaon', bn: 'ঠাকুরগাঁও', upazilas: [{en:'Baliadangi',bn:'বালিয়াডাঙ্গী'},{en:'Haripur',bn:'হরিপুর'},{en:'Pirganj',bn:'পীরগঞ্জ'},{en:'Ranisankail',bn:'রাণীশংকৈল'}] },
    { en: 'Gaibandha', bn: 'গাইবান্ধা', upazilas: [{en:'Fulchhari',bn:'ফুলছড়ি'},{en:'Gobindaganj',bn:'গোবিন্দগঞ্জ'},{en:'Palashbari',bn:'পলাশবাড়ী'},{en:'Sadullapur',bn:'সাদুল্লাপুর'},{en:'Saghata',bn:'সাঘাটা'},{en:'Sundarganj',bn:'সুন্দরগঞ্জ'}] },
    { en: 'Lalmonirhat', bn: 'লালমনিরহাট', upazilas: [{en:'Aditmari',bn:'আদিতমারী'},{en:'Hatibandha',bn:'হাতীবান্ধা'},{en:'Kaliganj',bn:'কালীগঞ্জ'},{en:'Patgram',bn:'পাটগ্রাম'}] },
    { en: 'Nilphamari', bn: 'নীলফামারী', upazilas: [{en:'Dimla',bn:'ডিমলা'},{en:'Domar',bn:'ডোমার'},{en:'Jaldhaka',bn:'জলঢাকা'},{en:'Kishoreganj',bn:'কিশোরগঞ্জ'},{en:'Saidpur',bn:'সৈয়দপুর'}] },
    { en: 'Panchagarh', bn: 'পঞ্চগড়', upazilas: [{en:'Atwari',bn:'আটোয়ারী'},{en:'Boda',bn:'বোদা'},{en:'Debiganj',bn:'দেবীগঞ্জ'},{en:'Tetulia',bn:'তেতুলিয়া'}] },
  ]},
  mymensingh: { en: 'Mymensingh', bn: 'ময়মনসিংহ', cities: [
    { en: 'Mymensingh', bn: 'ময়মনসিংহ', upazilas: [{en:'Bhaluka',bn:'ভালুকা'},{en:'Dhobaura',bn:'ধোবাউড়া'},{en:'Fulbaria',bn:'ফুলবাড়িয়া'},{en:'Gaffargaon',bn:'গফরগাঁও'},{en:'Gauripur',bn:'গৌরীপুর'},{en:'Haluaghat',bn:'হালুয়াঘাট'},{en:'Ishwarganj',bn:'ঈশ্বরগঞ্জ'},{en:'Muktagachha',bn:'মুক্তাগাছা'},{en:'Nandail',bn:'নান্দাইল'},{en:'Phulpur',bn:'ফুলপুর'},{en:'Trishal',bn:'ত্রিশাল'}] },
    { en: 'Jamalpur', bn: 'জামালপুর', upazilas: [{en:'Baksiganj',bn:'বকশীগঞ্জ'},{en:'Dewanganj',bn:'দেওয়ানগঞ্জ'},{en:'Islampur',bn:'ইসলামপুর'},{en:'Madarganj',bn:'মাদারগঞ্জ'},{en:'Melandaha',bn:'মেলান্দহ'},{en:'Sarishabari',bn:'সরিষাবাড়ী'}] },
    { en: 'Netrokona', bn: 'নেত্রকোণা', upazilas: [{en:'Atpara',bn:'আটপাড়া'},{en:'Barhatta',bn:'বারহাট্টা'},{en:'Durgapur',bn:'দুর্গাপুর'},{en:'Khaliajuri',bn:'খালিয়াজুরী'},{en:'Kalmakanda',bn:'কলমাকান্দা'},{en:'Kendua',bn:'কেন্দুয়া'},{en:'Madan',bn:'মদন'},{en:'Mohanganj',bn:'মোহনগঞ্জ'},{en:'Purbadhala',bn:'পূর্বধলা'}] },
    { en: 'Sherpur', bn: 'শেরপুর', upazilas: [{en:'Jhenaigati',bn:'ঝিনাইগাতী'},{en:'Nakla',bn:'নকলা'},{en:'Nalitabari',bn:'নালিতাবাড়ী'},{en:'Sreebardi',bn:'শ্রীবরদী'}] },
  ]},
};

const PRAYER_ORDER = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Sunset', 'Isha'] as const;

const PRAYER_NAMES: Record<string, { en: string; bn: string; icon: string }> = {
  Fajr: { en: 'Fajr', bn: 'ফজর', icon: '🌅' },
  Sunrise: { en: 'Sunrise', bn: 'সূর্যোদয়', icon: '☀️' },
  Dhuhr: { en: 'Dhuhr', bn: 'যোহর', icon: '🌤️' },
  Asr: { en: 'Asr', bn: 'আসর', icon: '🌥️' },
  Maghrib: { en: 'Maghrib', bn: 'মাগরিব', icon: '🌇' },
  Sunset: { en: 'Sunset', bn: 'সূর্যাস্ত', icon: '🌆' },
  Isha: { en: 'Isha', bn: 'ইশা', icon: '🌙' },
};

// Minutes after sunrise when nafl prayer (Ishraq) becomes permissible
const ISHRAQ_OFFSET_MIN = 15;
// Minutes before Dhuhr when prayer is forbidden (zawal)
const ZAWAL_BEFORE_DHUHR_MIN = 5;

const addMinutesToTime = (timeStr: string, mins: number): string => {
  const clean = timeStr.replace(/\s*\(.*\)/, '');
  const [h, m] = clean.split(':').map(Number);
  const total = (h * 60 + m + mins + 24 * 60) % (24 * 60);
  const hh = Math.floor(total / 60).toString().padStart(2, '0');
  const mm = (total % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
};

const toBanglaNum = (str: string) => str.replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);

// Convert "HH:MM" string to total minutes since midnight (timezone-agnostic)
const timeToMinutes = (timeStr: string): number => {
  const clean = timeStr.replace(/\s*\(.*\)/, '');
  const [h, m] = clean.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

// Get current time in the target timezone as minutes since midnight
const nowMinutesInTz = (now: Date, tz: string): number => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value || 0);
  return get('hour') * 60 + get('minute') + get('second') / 60;
};

const formatCountdown = (ms: number, isBn: boolean): string => {
  if (ms <= 0) return isBn ? '০০h ০০m ০০s' : '00h 00m 00s';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600).toString().padStart(2, '0');
  const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  const str = `${h}:${m}:${s}`;
  return isBn ? toBanglaNum(str) : str;
};

const formatDisplayTime = (timeStr: string, isBn: boolean, timeFormat: '24h' | '12h'): string => {
  if (!timeStr) return '';
  const clean = timeStr.replace(/\s*\(.*\)/, '');
  if (timeFormat === '24h') {
    return isBn ? toBanglaNum(clean) : clean;
  }
  const [rawHour, rawMinute] = clean.split(':').map(Number);
  const period = rawHour >= 12 ? 'PM' : 'AM';
  const hour12 = rawHour % 12 || 12;
  const formatted = `${hour12.toString().padStart(2, '0')}:${rawMinute.toString().padStart(2, '0')} ${period}`;
  return isBn ? `${toBanglaNum(formatted.slice(0, 5))} ${period}` : formatted;
};

const PrayerTimesWidget = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { config } = usePrayerCalendarSettings();

  // Use backend defaults, allow user override
  const [country, setCountry] = useState<string | null>(null);
  const [division, setDivision] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [upazila, setUpazila] = useState<string>('');
  const [timeFormat, setTimeFormat] = useState<'24h' | '12h' | null>(null);
  const [methodOverride, setMethodOverride] = useState<number | null>(null);
  const [now, setNow] = useState(new Date());

  // Effective values: user override > backend config
  const effectiveCountry = country ?? config.default_country;
  const effectiveDivision = division ?? config.default_division;
  const effectiveCity = city ?? config.default_city;
  const effectiveTimeFormat = timeFormat ?? config.time_format;
  const effectiveMethod = methodOverride ?? config.calculation_method;

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Use upazila as the city for Aladhan when selected (more precise sunrise/sunset)
  const cityObj = effectiveCountry === 'BD'
    ? BD_DIVISIONS[effectiveDivision]?.cities.find(c => c.en === effectiveCity)
    : null;
  const selectedCity = effectiveCountry === 'BD'
    ? (upazila || effectiveCity)
    : (COUNTRIES.find(c => c.code === effectiveCountry)?.en || 'Dhaka');
  const selectedCountry = COUNTRIES.find(c => c.code === effectiveCountry)?.en || 'Bangladesh';

  // IANA timezones — DST-aware. Aladhan applies offset based on this TZ for the
  // requested date, so DST transitions are handled automatically.
  // Notes (no DST): BD, SA, IN, PK, AE, MY, ID (all sub-zones), TR (since 2016),
  // QA, KW, OM, BH. DST observed: EG (since 2023), GB, EU, most US states.
  // Single-zone countries — safe to map by country code.
  const COUNTRY_TZ: Record<string, string> = {
    BD: 'Asia/Dhaka',          // BST UTC+6, no DST
    SA: 'Asia/Riyadh',         // AST UTC+3, no DST
    IN: 'Asia/Kolkata',        // IST UTC+5:30, no DST (single zone)
    PK: 'Asia/Karachi',        // PKT UTC+5, no DST
    AE: 'Asia/Dubai',          // GST UTC+4, no DST
    MY: 'Asia/Kuala_Lumpur',   // MYT UTC+8, no DST (single zone since 1982)
    TR: 'Europe/Istanbul',     // TRT UTC+3, no DST since 2016
    EG: 'Africa/Cairo',        // EET/EEST, DST resumed 2023
    QA: 'Asia/Qatar',          // AST UTC+3
    KW: 'Asia/Kuwait',         // AST UTC+3
    OM: 'Asia/Muscat',         // GST UTC+4
    BH: 'Asia/Bahrain',        // AST UTC+3
    GB: 'Europe/London',       // GMT/BST, DST observed
    // Multi-zone countries — default to capital/most-populous; override per city below.
    ID: 'Asia/Jakarta',        // WIB UTC+7 (Java/Sumatra). WITA=Makassar +8, WIT=Jayapura +9
    US: 'America/New_York',    // ET. Override per city for CT/MT/PT/AK/HI
  };

  // City-level TZ overrides for countries that span multiple IANA zones.
  // Keys are normalised lowercase city names that match what Aladhan/our UI uses.
  const CITY_TZ: Record<string, string> = {
    // Indonesia (WIB / WITA / WIT)
    'jakarta': 'Asia/Jakarta',
    'bandung': 'Asia/Jakarta',
    'surabaya': 'Asia/Jakarta',
    'medan': 'Asia/Jakarta',
    'semarang': 'Asia/Jakarta',
    'palembang': 'Asia/Jakarta',
    'denpasar': 'Asia/Makassar',
    'makassar': 'Asia/Makassar',
    'balikpapan': 'Asia/Makassar',
    'manado': 'Asia/Makassar',
    'jayapura': 'Asia/Jayapura',
    'ambon': 'Asia/Jayapura',
    // United States (ET / CT / MT / PT / AKT / HAT)
    'new york': 'America/New_York',
    'washington': 'America/New_York',
    'boston': 'America/New_York',
    'miami': 'America/New_York',
    'atlanta': 'America/New_York',
    'philadelphia': 'America/New_York',
    'chicago': 'America/Chicago',
    'houston': 'America/Chicago',
    'dallas': 'America/Chicago',
    'minneapolis': 'America/Chicago',
    'new orleans': 'America/Chicago',
    'denver': 'America/Denver',
    'salt lake city': 'America/Denver',
    'albuquerque': 'America/Denver',
    'phoenix': 'America/Phoenix',     // AZ does not observe DST
    'los angeles': 'America/Los_Angeles',
    'san francisco': 'America/Los_Angeles',
    'san diego': 'America/Los_Angeles',
    'seattle': 'America/Los_Angeles',
    'portland': 'America/Los_Angeles',
    'las vegas': 'America/Los_Angeles',
    'anchorage': 'America/Anchorage',
    'honolulu': 'Pacific/Honolulu',   // HI does not observe DST
  };

  // Validate the chosen TZ at runtime; fall back to Asia/Dhaka if invalid.
  const isValidTz = (z: string): boolean => {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: z });
      return true;
    } catch {
      return false;
    }
  };
  const cityKey = (selectedCity || '').trim().toLowerCase();
  const candidateTz =
    CITY_TZ[cityKey] || COUNTRY_TZ[effectiveCountry] || 'Asia/Dhaka';
  const tz = isValidTz(candidateTz) ? candidateTz : 'Asia/Dhaka';

  // DST-aware UTC offset (in minutes) for the target TZ on the current date.
  // Used to send Aladhan an explicit numeric offset hint, which prevents
  // server-side TZ-name parsing differences across DST transitions.
  const getTzOffsetMinutes = (date: Date, zone: string): number => {
    try {
      const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone: zone, hourCycle: 'h23',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      });
      const parts = dtf.formatToParts(date).reduce<Record<string, string>>((acc, p) => {
        if (p.type !== 'literal') acc[p.type] = p.value;
        return acc;
      }, {});
      const asUTC = Date.UTC(
        Number(parts.year), Number(parts.month) - 1, Number(parts.day),
        Number(parts.hour), Number(parts.minute), Number(parts.second)
      );
      return Math.round((asUTC - date.getTime()) / 60000);
    } catch {
      return 0;
    }
  };
  const tzOffsetMin = getTzOffsetMinutes(now, tz);

  // Compute today's date in the target timezone (not the user's device TZ)
  const todayInTz = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now); // YYYY-MM-DD
  const [tyY, tyM, tyD] = todayInTz.split('-');
  const todayKey = todayInTz;
  const apiDateStr = `${tyD}-${tyM}-${tyY}`; // DD-MM-YYYY for Aladhan

  // localStorage cache key — scoped per location/method so different cities don't collide
  const cacheKey = `prayer-cache:${selectedCountry}:${selectedCity}:${effectiveMethod}:${tz}`;

  const { data: prayerData, isLoading, isError } = useQuery({
    queryKey: ['prayer-times', selectedCity, selectedCountry, effectiveMethod, todayKey, tz, tzOffsetMin],
    queryFn: async () => {
      // timezonestring = DST-aware IANA name; Aladhan recomputes offset for the requested date.
      const url = `https://api.aladhan.com/v1/timingsByCity/${apiDateStr}?city=${encodeURIComponent(selectedCity)}&country=${encodeURIComponent(selectedCountry)}&method=${effectiveMethod}&timezonestring=${encodeURIComponent(tz)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch prayer times');
      const json = await res.json();
      // Persist last successful payload + the date it was fetched for, so we can fall back later.
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), date: todayKey, data: json.data }));
      } catch { /* quota / private mode — ignore */ }
      return json.data;
    },
    initialData: () => {
      try {
        const raw = localStorage.getItem(cacheKey);
        if (raw) {
          const parsed = JSON.parse(raw) as CachedPayload;
          if (parsed.date === todayKey) return parsed.data;
        }
      } catch {}
      return undefined;
    },
    staleTime: 6 * 60 * 60 * 1000,
    refetchInterval: false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });

  // Fallback: if API failed or hasn't responded yet, restore last known good payload from localStorage.
  type CachedPayload = { savedAt: number; date: string; data: any };
  const cachedFallback: CachedPayload | null = (() => {
    if (prayerData) return null;
    try {
      const raw = localStorage.getItem(cacheKey);
      return raw ? (JSON.parse(raw) as CachedPayload) : null;
    } catch {
      return null;
    }
  })();

  const effectiveData = prayerData ?? cachedFallback?.data ?? null;
  const usingFallback = !prayerData && !!cachedFallback;
  const fallbackIsStale = usingFallback && cachedFallback!.date !== todayKey;

  const timings = effectiveData?.timings;
  const hijriDate = effectiveData?.date?.hijri;

  const getActiveInfo = () => {
    if (!timings) return { activeIndex: -1, nextIndex: -1, activeRemainingMs: 0 };
    // All prayer times are in target city's TZ (e.g. Asia/Dhaka). Compare in that TZ too.
    const minutesList = PRAYER_ORDER.map(k => timeToMinutes(timings[k] || '00:00'));
    const nowMin = nowMinutesInTz(now, tz);
    const MIN_PER_DAY = 24 * 60;
    for (let i = PRAYER_ORDER.length - 1; i >= 0; i--) {
      if (nowMin >= minutesList[i]) {
        const nextIdx = i + 1;
        if (nextIdx < PRAYER_ORDER.length) {
          const remaining = (minutesList[nextIdx] - nowMin) * 60 * 1000;
          return { activeIndex: i, nextIndex: nextIdx, activeRemainingMs: Math.max(0, remaining) };
        }
        // Past Isha — countdown to tomorrow's Fajr
        const remaining = (MIN_PER_DAY - nowMin + minutesList[0]) * 60 * 1000;
        return { activeIndex: i, nextIndex: 0, activeRemainingMs: Math.max(0, remaining) };
      }
    }
    // Before Fajr — previous Isha is still "active"
    const remaining = (minutesList[0] - nowMin) * 60 * 1000;
    return { activeIndex: PRAYER_ORDER.length - 1, nextIndex: 0, activeRemainingMs: Math.max(0, remaining) };
  };

  const { activeIndex, activeRemainingMs } = getActiveInfo();

  // Debug snapshot — only rendered in dev (Vite import.meta.env.DEV)
  const nowMinDebug = timings ? nowMinutesInTz(now, tz) : 0;
  const debugInfo = {
    tz,
    tzOffsetMin,
    nowMin: Number(nowMinDebug.toFixed(2)),
    nowHHMM: `${String(Math.floor(nowMinDebug / 60)).padStart(2, '0')}:${String(Math.floor(nowMinDebug % 60)).padStart(2, '0')}`,
    activeIndex,
    activePrayer: activeIndex >= 0 ? PRAYER_ORDER[activeIndex] : '—',
    nextPrayer: activeIndex >= 0 ? PRAYER_ORDER[(activeIndex + 1) % PRAYER_ORDER.length] : '—',
    remainingMs: activeRemainingMs,
    method: effectiveMethod,
    city: selectedCity,
    country: selectedCountry,
  };

  if (!config.show_prayer_times) return null;

  return (
    <div className="card-elevated rounded-xl overflow-hidden">
      <div className="bg-primary p-3 text-primary-foreground">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🕌</span>
          <h3 className="font-display font-bold text-sm">
            {bn ? 'নামাজের সময়সূচী' : 'Prayer Times'}
          </h3>
        </div>
        {hijriDate && (
          <p className="text-[10px] opacity-80">
            {hijriDate.day} {hijriDate.month.en} {hijriDate.year} {bn ? 'হিজরী' : 'Hijri'}
          </p>
        )}
      </div>

      <div className="p-3 space-y-2 bg-muted/30 border-b border-border">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
          <MapPin className="w-3 h-3" />
          <span>{bn ? 'অবস্থান নির্বাচন' : 'Select Location'}</span>
        </div>
        <Select value={effectiveCountry} onValueChange={(v) => { setCountry(v); if (v !== 'BD') { setDivision(''); setCity(''); } else { setDivision(config.default_division); setCity(config.default_city); } }}>
          <SelectTrigger className="h-9 text-xs sm:text-sm font-medium">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map(c => (
              <SelectItem key={c.code} value={c.code} className="text-xs sm:text-sm">{bn ? c.bn : c.en}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {effectiveCountry === 'BD' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Select value={effectiveDivision} onValueChange={(v) => { setDivision(v); setCity(BD_DIVISIONS[v].cities[0].en); setUpazila(''); }}>
                <SelectTrigger className="h-9 text-xs sm:text-sm font-medium"><SelectValue placeholder={bn ? 'বিভাগ' : 'Division'} /></SelectTrigger>
                <SelectContent>
                  {Object.entries(BD_DIVISIONS).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs sm:text-sm">{bn ? v.bn : v.en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={effectiveCity} onValueChange={v => { setCity(v); setUpazila(''); }}>
                <SelectTrigger className="h-9 text-xs sm:text-sm font-medium"><SelectValue placeholder={bn ? 'জেলা' : 'District'} /></SelectTrigger>
                <SelectContent>
                  {effectiveDivision && BD_DIVISIONS[effectiveDivision]?.cities.map(c => (
                    <SelectItem key={c.en} value={c.en} className="text-xs sm:text-sm">{bn ? c.bn : c.en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {cityObj?.upazilas && cityObj.upazilas.length > 0 && (
              <Select value={upazila || '__district__'} onValueChange={v => setUpazila(v === '__district__' ? '' : v)}>
                <SelectTrigger className="h-9 text-xs sm:text-sm font-medium"><SelectValue placeholder={bn ? 'উপজেলা' : 'Upazila'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__district__" className="text-xs sm:text-sm">{bn ? `— সদর (${cityObj.bn}) —` : `— District HQ (${cityObj.en}) —`}</SelectItem>
                  {cityObj.upazilas.map(u => (
                    <SelectItem key={u.en} value={u.en} className="text-xs sm:text-sm">{bn ? u.bn : u.en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Select value={effectiveTimeFormat} onValueChange={(value: '24h' | '12h') => setTimeFormat(value)}>
            <SelectTrigger className="h-9 text-xs sm:text-sm font-medium">
              <SelectValue placeholder={bn ? 'টাইম ফরমেট' : 'Time format'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h" className="text-xs sm:text-sm">24 Hour</SelectItem>
              <SelectItem value="12h" className="text-xs sm:text-sm">12 Hour (AM/PM)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={String(effectiveMethod)} onValueChange={(v) => setMethodOverride(Number(v))}>
            <SelectTrigger className="h-9 text-xs sm:text-sm font-medium">
              <SelectValue placeholder={bn ? 'হিসাব পদ্ধতি' : 'Method'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1" className="text-xs sm:text-sm">{bn ? 'করাচী (হানাফী)' : 'Karachi (Hanafi)'}</SelectItem>
              <SelectItem value="2" className="text-xs sm:text-sm">{bn ? 'ISNA (উত্তর আমেরিকা)' : 'ISNA (N. America)'}</SelectItem>
              <SelectItem value="3" className="text-xs sm:text-sm">{bn ? 'বিশ্ব মুসলিম লীগ' : 'Muslim World League'}</SelectItem>
              <SelectItem value="4" className="text-xs sm:text-sm">{bn ? 'উম্মুল কুরা মক্কা' : 'Umm al-Qura, Makkah'}</SelectItem>
              <SelectItem value="5" className="text-xs sm:text-sm">{bn ? 'মিশর' : 'Egyptian'}</SelectItem>
              <SelectItem value="8" className="text-xs sm:text-sm">{bn ? 'গালফ অঞ্চল' : 'Gulf Region'}</SelectItem>
              <SelectItem value="13" className="text-xs sm:text-sm">{bn ? 'তুরস্ক (Diyanet)' : 'Diyanet (Turkey)'}</SelectItem>
              <SelectItem value="15" className="text-xs sm:text-sm">{bn ? 'মুনলাইটিং সাইটিং কাউন্সিল' : 'Moonsighting Committee'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="p-2">
        {isLoading && !timings ? (
          <div className="text-center py-6 text-xs text-muted-foreground">{bn ? 'লোড হচ্ছে...' : 'Loading...'}</div>
        ) : timings ? (
          <>
            {usingFallback && (
              <div className={`mb-2 px-2 py-1.5 rounded-md text-[10px] leading-relaxed ${
                fallbackIsStale
                  ? 'bg-destructive/10 border border-destructive/30 text-destructive'
                  : 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-700 dark:text-yellow-400'
              }`}>
                {fallbackIsStale
                  ? (bn
                      ? `⚠️ অফলাইন: গতকাল (${cachedFallback!.date})-এর সর্বশেষ সংরক্ষিত সময় দেখানো হচ্ছে। ইন্টারনেট সংযোগ চেক করুন।`
                      : `⚠️ Offline: showing last saved times from ${cachedFallback!.date}. Check internet connection.`)
                  : (bn
                      ? '📦 ক্যাশ থেকে দেখানো হচ্ছে — লাইভ আপডেট লোড হচ্ছে...'
                      : '📦 Showing cached data — live update loading...')}
              </div>
            )}

            {/* Ishraq / forbidden-time info banner */}
            {timings.Sunrise && timings.Dhuhr && timings.Sunset && (
              <div className="mb-2 px-2 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-[10px] leading-relaxed">
                <div className="flex justify-between gap-2">
                  <span className="text-foreground">
                    {bn ? `সূর্যোদয়ের ${toBanglaNum(String(ISHRAQ_OFFSET_MIN))} মিনিট পর ইশরাকের নামাজ পড়া যাবে:` : `Ishraq prayer permitted ${ISHRAQ_OFFSET_MIN} min after sunrise:`}
                  </span>
                  <span className="font-mono font-bold text-primary">
                    {formatDisplayTime(addMinutesToTime(timings.Sunrise, ISHRAQ_OFFSET_MIN), bn, effectiveTimeFormat)}
                  </span>
                </div>
                <div className="flex justify-between gap-2 mt-0.5">
                  <span className="text-muted-foreground">
                    {bn ? 'সূর্যাস্ত:' : 'Sunset:'}
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {formatDisplayTime(timings.Sunset.replace(/\s*\(.*\)/, ''), bn, effectiveTimeFormat)}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-[1fr_auto_auto] gap-1 px-2 pb-1 mb-1 border-b border-border text-[10px] text-muted-foreground font-medium">
              <span>{bn ? 'ওয়াক্ত' : 'Prayer'}</span>
              <span className="text-center w-20">{bn ? 'শুরু' : 'Start'}</span>
              <span className="text-center w-20">{bn ? 'শেষ' : 'End'}</span>
            </div>
            <div className="space-y-0.5">
              {PRAYER_ORDER.map((key, idx) => {
                const startTime = timings[key]?.replace(/\s*\(.*\)/, '') || '';
                const nextKey = PRAYER_ORDER[idx + 1];
                const endTime = nextKey
                  ? (timings[nextKey]?.replace(/\s*\(.*\)/, '') || '')
                  : (timings[PRAYER_ORDER[0]]?.replace(/\s*\(.*\)/, '') || '');
                const isActive = idx === activeIndex;
                const val = PRAYER_NAMES[key];

                return (
                  <div
                    key={key}
                    className={`grid grid-cols-[1fr_auto_auto] gap-1 items-center px-2 py-1.5 rounded-md transition-colors ${
                      isActive
                        ? 'bg-primary/10 ring-1 ring-primary/30'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm shrink-0">{val.icon}</span>
                      <span className={`text-xs font-medium ${isActive ? 'text-primary font-bold' : 'text-foreground'}`}>
                        {bn ? val.bn : val.en}
                        {isActive && activeRemainingMs > 0 && (
                          <span className="ml-2 text-[10px] font-medium text-primary">
                            {bn ? 'ends in' : 'ends in'} {formatCountdown(activeRemainingMs, bn)}
                          </span>
                        )}
                      </span>
                    </div>
                    <span className={`text-[11px] font-mono text-center w-20 ${isActive ? 'font-bold text-primary' : 'text-foreground'}`}>
                      {formatDisplayTime(startTime, bn, effectiveTimeFormat)}
                    </span>
                    <span className="text-[11px] font-mono text-center w-20 text-muted-foreground">
                      {endTime ? formatDisplayTime(endTime, bn, effectiveTimeFormat) : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-4 text-xs text-muted-foreground">{bn ? 'তথ্য পাওয়া যায়নি' : 'No data available'}</div>
        )}
      </div>

      {import.meta.env.DEV && (
        <details className="border-t border-border bg-muted/40 px-3 py-2 text-[10px] font-mono text-muted-foreground">
          <summary className="cursor-pointer select-none font-semibold text-foreground">
            🛠 Debug · tz={debugInfo.tz} · now={debugInfo.nowHHMM} · active={debugInfo.activePrayer}
          </summary>
          <pre className="mt-1 whitespace-pre-wrap break-all leading-relaxed">
{JSON.stringify(debugInfo, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

export default PrayerTimesWidget;
