// ─────────────────────────────────────────────────────────────
// src/database/seed/clubs.seed.ts
// ─────────────────────────────────────────────────────────────
import { Club } from './../modules/clubs/club.model';
import { IDS } from './ids';

export async function seedClubs() {
    const clubs = [
        { id: IDS.clubs.alHilal,   name: 'Al Hilal',   nameAr: 'الهلال',   city: 'Riyadh',   primaryColor: '#003DA5', secondaryColor: '#FFFFFF', stadium: 'Kingdom Arena',              stadiumCapacity: 60000, foundedYear: 1957 },
        { id: IDS.clubs.alNassr,   name: 'Al Nassr',   nameAr: 'النصر',    city: 'Riyadh',   primaryColor: '#FFD700', secondaryColor: '#000080', stadium: 'Al Awwal Park',              stadiumCapacity: 25000, foundedYear: 1955 },
        { id: IDS.clubs.alAhli,    name: 'Al Ahli',    nameAr: 'الأهلي',   city: 'Jeddah',   primaryColor: '#006633', secondaryColor: '#FFFFFF', stadium: 'King Abdullah Sports City',  stadiumCapacity: 62000, foundedYear: 1937 },
        { id: IDS.clubs.alIttihad, name: 'Al Ittihad', nameAr: 'الاتحاد',  city: 'Jeddah',   primaryColor: '#FFD700', secondaryColor: '#000000', stadium: 'King Abdullah Sports City',  stadiumCapacity: 62000, foundedYear: 1927 },
        { id: IDS.clubs.alShabab,  name: 'Al Shabab',  nameAr: 'الشباب',   city: 'Riyadh',   primaryColor: '#FFFFFF', secondaryColor: '#006400', stadium: 'Al Shabab Stadium',          stadiumCapacity: 25000, foundedYear: 1947 },
        { id: IDS.clubs.alFateh,   name: 'Al Fateh',   nameAr: 'الفتح',    city: 'Al-Hasa',  primaryColor: '#005A2B', secondaryColor: '#FFFFFF', stadium: 'Prince Abdullah bin Jalawi', stadiumCapacity: 20000, foundedYear: 1946 },
        { id: IDS.clubs.alTaawoun, name: 'Al Taawoun', nameAr: 'التعاون',  city: 'Buraidah', primaryColor: '#FFA500', secondaryColor: '#FFFFFF', stadium: 'King Abdullah Sport City',   stadiumCapacity: 25000, foundedYear: 1956 },
        { id: IDS.clubs.alRaed,    name: 'Al Raed',    nameAr: 'الرائد',   city: 'Buraidah', primaryColor: '#FF0000', secondaryColor: '#FFFFFF', stadium: 'King Abdullah Sport City',   stadiumCapacity: 25000, foundedYear: 1954 },
    ].map(c => ({ ...c, league: 'Saudi Pro League', type: 'Club' as const, country: 'Saudi Arabia', isActive: true }));

    await Club.bulkCreate(clubs, { ignoreDuplicates: true });
    console.log('✅ Clubs seeded (8 SPL teams)');
}
