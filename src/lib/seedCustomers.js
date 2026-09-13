const face = (id) =>
  `https://images.unsplash.com/${id}?ixlib=rb-4.1.0&w=200&q=80&fm=jpg&crop=faces&fit=crop`;

const FACES = {
  manBlackCrew: face('photo-1624395213043-fa2e123b2656'),
  manTurban: face('photo-1493106819501-66d381c466f1'),
  manBlueRedShirt: face('photo-1545167622-3a6ac756afa4'),
  womanSmiling: face('photo-1494790108377-be9c29b29330'),
  manBlackCrew2: face('photo-1587397845856-e6cf49176c70'),
  womanBlackCrew: face('photo-1534528741775-53994a69daeb'),
  manHenley: face('photo-1500648767791-00dcc994a43e'),
};

export const SEED_CUSTOMERS = [
  { name: 'Ram Bahadur Thapa', due: 1250, image: FACES.manBlackCrew },
  { name: 'Sita Sharma', due: 0, image: FACES.womanSmiling },
  { name: 'Hari Prasad Adhikari', due: 340, image: FACES.manTurban },
  { name: 'Gita Gurung', due: 0, image: FACES.womanBlackCrew },
  { name: 'Krishna Yadav', due: 2100, image: FACES.manBlueRedShirt },
  { name: 'Laxmi Magar', due: 150, image: FACES.womanSmiling },
  { name: 'Dilli Ram Pokharel', due: 0, image: FACES.manBlackCrew2 },
  { name: 'Mina Tamang', due: 875, image: FACES.womanBlackCrew },
  { name: 'Bishnu Shrestha', due: 0, image: FACES.manHenley },
  { name: 'Kamala Karki', due: 420, image: FACES.womanSmiling },
];
