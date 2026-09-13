export const SEED_CUSTOMERS = [
  { name: 'Ram Bahadur Thapa', due: 1250 },
  { name: 'Sita Sharma', due: 0 },
  { name: 'Hari Prasad Adhikari', due: 340 },
  { name: 'Gita Gurung', due: 0 },
  { name: 'Krishna Yadav', due: 2100 },
  { name: 'Laxmi Magar', due: 150 },
  { name: 'Dilli Ram Pokharel', due: 0 },
  { name: 'Mina Tamang', due: 875 },
  { name: 'Bishnu Shrestha', due: 0 },
  { name: 'Kamala Karki', due: 420 },
  { name: 'Sher Bahadur Rai', due: 0 },
  { name: 'Nirmala Limbu', due: 1980 },
].map(c => ({
  ...c,
  image: 'https://via.placeholder.com/150/f1f5f9/64748b?text=' + encodeURIComponent(c.name.charAt(0).toUpperCase()),
}));
