/**
 * Default geography: States/UTs, districts, cities/towns/villages.
 * Used in priest signup (admin) and user discovery.
 */

export interface CityTownVillage {
  id: string;
  name: string;
}

export interface District {
  id: string;
  name: string;
  cities: CityTownVillage[];
}

export interface StateOrUT {
  id: string;
  name: string;
  districts: District[];
}

/** All States & UTs with districts and cities. Extensible - add more districts/cities as needed. */
export const REGIONS: StateOrUT[] = [
  {
    id: 'andhra-pradesh',
    name: 'Andhra Pradesh',
    districts: [
      { id: 'chittoor', name: 'Chittoor', cities: [{ id: 'tirupati', name: 'Tirupati' }, { id: 'chittoor-city', name: 'Chittoor' }, { id: 'puttur', name: 'Puttur' }] },
      { id: 'kadapa', name: 'Kadapa', cities: [{ id: 'kadapa-city', name: 'Kadapa' }, { id: 'proddatur', name: 'Proddatur' }] },
      { id: 'anantapur', name: 'Anantapur', cities: [{ id: 'anantapur-city', name: 'Anantapur' }, { id: 'hindupur', name: 'Hindupur' }] },
      { id: 'guntur', name: 'Guntur', cities: [{ id: 'guntur-city', name: 'Guntur' }, { id: 'vijayawada', name: 'Vijayawada' }] },
    ],
  },
  {
    id: 'tamil-nadu',
    name: 'Tamil Nadu',
    districts: [
      { id: 'chennai', name: 'Chennai', cities: [{ id: 'chennai-city', name: 'Chennai' }, { id: 'tambaram', name: 'Tambaram' }] },
      { id: 'kanchipuram', name: 'Kanchipuram', cities: [{ id: 'kanchipuram-city', name: 'Kanchipuram' }, { id: 'sriperumbudur', name: 'Sriperumbudur' }] },
      { id: 'madurai', name: 'Madurai', cities: [{ id: 'madurai-city', name: 'Madurai' }, { id: 'melur', name: 'Melur' }] },
      { id: 'coimbatore', name: 'Coimbatore', cities: [{ id: 'coimbatore-city', name: 'Coimbatore' }, { id: 'pollachi', name: 'Pollachi' }] },
    ],
  },
  {
    id: 'karnataka',
    name: 'Karnataka',
    districts: [
      { id: 'bangalore', name: 'Bengaluru Urban', cities: [{ id: 'bangalore-city', name: 'Bengaluru' }, { id: 'whitefield', name: 'Whitefield' }] },
      { id: 'mysore', name: 'Mysuru', cities: [{ id: 'mysore-city', name: 'Mysuru' }, { id: 'nanjangud', name: 'Nanjangud' }] },
      { id: 'mangalore', name: 'Dakshina Kannada', cities: [{ id: 'mangalore-city', name: 'Mangaluru' }, { id: 'udupi', name: 'Udupi' }] },
    ],
  },
  {
    id: 'maharashtra',
    name: 'Maharashtra',
    districts: [
      { id: 'mumbai', name: 'Mumbai', cities: [{ id: 'mumbai-city', name: 'Mumbai' }, { id: 'thane', name: 'Thane' }] },
      { id: 'pune', name: 'Pune', cities: [{ id: 'pune-city', name: 'Pune' }, { id: 'pimpri', name: 'Pimpri-Chinchwad' }] },
      { id: 'nashik', name: 'Nashik', cities: [{ id: 'nashik-city', name: 'Nashik' }, { id: 'malegaon', name: 'Malegaon' }] },
    ],
  },
  {
    id: 'telangana',
    name: 'Telangana',
    districts: [
      { id: 'hyderabad', name: 'Hyderabad', cities: [{ id: 'hyderabad-city', name: 'Hyderabad' }, { id: 'secunderabad', name: 'Secunderabad' }] },
      { id: 'warangal', name: 'Warangal', cities: [{ id: 'warangal-city', name: 'Warangal' }, { id: 'hanumakonda', name: 'Hanumakonda' }] },
    ],
  },
  {
    id: 'kerala',
    name: 'Kerala',
    districts: [
      { id: 'thiruvananthapuram', name: 'Thiruvananthapuram', cities: [{ id: 'tvm-city', name: 'Thiruvananthapuram' }, { id: 'attingal', name: 'Attingal' }] },
      { id: 'kochi', name: 'Ernakulam', cities: [{ id: 'kochi-city', name: 'Kochi' }, { id: 'aluva', name: 'Aluva' }] },
    ],
  },
  {
    id: 'gujarat',
    name: 'Gujarat',
    districts: [
      { id: 'ahmedabad', name: 'Ahmedabad', cities: [{ id: 'ahmedabad-city', name: 'Ahmedabad' }, { id: 'gandhinagar', name: 'Gandhinagar' }] },
      { id: 'surat', name: 'Surat', cities: [{ id: 'surat-city', name: 'Surat' }] },
    ],
  },
  {
    id: 'rajasthan',
    name: 'Rajasthan',
    districts: [
      { id: 'jaipur', name: 'Jaipur', cities: [{ id: 'jaipur-city', name: 'Jaipur' }] },
      { id: 'udaipur', name: 'Udaipur', cities: [{ id: 'udaipur-city', name: 'Udaipur' }] },
    ],
  },
  {
    id: 'uttar-pradesh',
    name: 'Uttar Pradesh',
    districts: [
      { id: 'lucknow', name: 'Lucknow', cities: [{ id: 'lucknow-city', name: 'Lucknow' }] },
      { id: 'varanasi', name: 'Varanasi', cities: [{ id: 'varanasi-city', name: 'Varanasi' }] },
    ],
  },
  {
    id: 'west-bengal',
    name: 'West Bengal',
    districts: [
      { id: 'kolkata', name: 'Kolkata', cities: [{ id: 'kolkata-city', name: 'Kolkata' }] },
      { id: 'howrah', name: 'Howrah', cities: [{ id: 'howrah-city', name: 'Howrah' }] },
    ],
  },
  {
    id: 'delhi',
    name: 'Delhi',
    districts: [
      { id: 'central-delhi', name: 'Central Delhi', cities: [{ id: 'delhi-central', name: 'Central Delhi' }] },
      { id: 'south-delhi', name: 'South Delhi', cities: [{ id: 'delhi-south', name: 'South Delhi' }] },
    ],
  },
  // Additional states/UTs with minimal data (extend as needed)
  { id: 'arunachal-pradesh', name: 'Arunachal Pradesh', districts: [{ id: 'itanagar', name: 'Itanagar', cities: [{ id: 'itanagar-city', name: 'Itanagar' }] }] },
  { id: 'assam', name: 'Assam', districts: [{ id: 'guwahati', name: 'Kamrup Metropolitan', cities: [{ id: 'guwahati-city', name: 'Guwahati' }] }] },
  { id: 'bihar', name: 'Bihar', districts: [{ id: 'patna', name: 'Patna', cities: [{ id: 'patna-city', name: 'Patna' }] }] },
  { id: 'chhattisgarh', name: 'Chhattisgarh', districts: [{ id: 'raipur', name: 'Raipur', cities: [{ id: 'raipur-city', name: 'Raipur' }] }] },
  { id: 'goa', name: 'Goa', districts: [{ id: 'north-goa', name: 'North Goa', cities: [{ id: 'panaji', name: 'Panaji' }] }] },
  { id: 'haryana', name: 'Haryana', districts: [{ id: 'gurgaon', name: 'Gurugram', cities: [{ id: 'gurgaon-city', name: 'Gurugram' }] }] },
  { id: 'himachal-pradesh', name: 'Himachal Pradesh', districts: [{ id: 'shimla', name: 'Shimla', cities: [{ id: 'shimla-city', name: 'Shimla' }] }] },
  { id: 'jammu-kashmir', name: 'Jammu and Kashmir', districts: [{ id: 'srinagar', name: 'Srinagar', cities: [{ id: 'srinagar-city', name: 'Srinagar' }] }] },
  { id: 'jharkhand', name: 'Jharkhand', districts: [{ id: 'ranchi', name: 'Ranchi', cities: [{ id: 'ranchi-city', name: 'Ranchi' }] }] },
  { id: 'madhya-pradesh', name: 'Madhya Pradesh', districts: [{ id: 'bhopal', name: 'Bhopal', cities: [{ id: 'bhopal-city', name: 'Bhopal' }] }] },
  { id: 'manipur', name: 'Manipur', districts: [{ id: 'imphal', name: 'Imphal', cities: [{ id: 'imphal-city', name: 'Imphal' }] }] },
  { id: 'meghalaya', name: 'Meghalaya', districts: [{ id: 'shillong', name: 'East Khasi Hills', cities: [{ id: 'shillong-city', name: 'Shillong' }] }] },
  { id: 'mizoram', name: 'Mizoram', districts: [{ id: 'aizawl', name: 'Aizawl', cities: [{ id: 'aizawl-city', name: 'Aizawl' }] }] },
  { id: 'nagaland', name: 'Nagaland', districts: [{ id: 'kohima', name: 'Kohima', cities: [{ id: 'kohima-city', name: 'Kohima' }] }] },
  { id: 'odisha', name: 'Odisha', districts: [{ id: 'bhubaneswar', name: 'Khordha', cities: [{ id: 'bhubaneswar-city', name: 'Bhubaneswar' }] }] },
  { id: 'punjab', name: 'Punjab', districts: [{ id: 'chandigarh-pb', name: 'Chandigarh', cities: [{ id: 'chandigarh-city', name: 'Chandigarh' }] }] },
  { id: 'sikkim', name: 'Sikkim', districts: [{ id: 'gangtok', name: 'East Sikkim', cities: [{ id: 'gangtok-city', name: 'Gangtok' }] }] },
  { id: 'tripura', name: 'Tripura', districts: [{ id: 'agartala', name: 'West Tripura', cities: [{ id: 'agartala-city', name: 'Agartala' }] }] },
  { id: 'uttarakhand', name: 'Uttarakhand', districts: [{ id: 'dehradun', name: 'Dehradun', cities: [{ id: 'dehradun-city', name: 'Dehradun' }] }] },
  { id: 'andaman-nicobar', name: 'Andaman and Nicobar Islands', districts: [{ id: 'port-blair', name: 'South Andaman', cities: [{ id: 'port-blair-city', name: 'Port Blair' }] }] },
  { id: 'chandigarh', name: 'Chandigarh', districts: [{ id: 'chandigarh-ut', name: 'Chandigarh', cities: [{ id: 'chandigarh-ut-city', name: 'Chandigarh' }] }] },
  { id: 'dadra-nagar-daman-diu', name: 'Dadra and Nagar Haveli and Daman and Diu', districts: [{ id: 'daman', name: 'Daman', cities: [{ id: 'daman-city', name: 'Daman' }] }] },
  { id: 'ladakh', name: 'Ladakh', districts: [{ id: 'leh', name: 'Leh', cities: [{ id: 'leh-city', name: 'Leh' }] }] },
  { id: 'lakshadweep', name: 'Lakshadweep', districts: [{ id: 'kavaratti', name: 'Lakshadweep', cities: [{ id: 'kavaratti-city', name: 'Kavaratti' }] }] },
  { id: 'puducherry', name: 'Puducherry', districts: [{ id: 'puducherry-dist', name: 'Puducherry', cities: [{ id: 'puducherry-city', name: 'Puducherry' }] }] },
];

export function getState(id: string): StateOrUT | undefined {
  return REGIONS.find((s) => s.id === id);
}

export function getDistrict(stateId: string, districtId: string): District | undefined {
  const state = getState(stateId);
  return state?.districts.find((d) => d.id === districtId);
}

export function getCity(stateId: string, districtId: string, cityId: string): CityTownVillage | undefined {
  const district = getDistrict(stateId, districtId);
  return district?.cities.find((c) => c.id === cityId);
}
