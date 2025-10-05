// services/firebaseService.ts
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "./firebase";

export interface TeamWeekStats {
  id: string;
  teamId: string;
  wins: number;
  losses: number;
  points: number;
  pointPeriodOne: number;
  pointsPeriodTwo: number;
  week: number;
}

export const fetchWeekStats = async (
  weekNumber?: number
): Promise<TeamWeekStats[]> => {
  try {
    let q;
    if (weekNumber) {
      // Fetch specific week
      q = query(
        collection(db, "teamWeekStats"),
        where("week", "==", weekNumber)
      );
    } else {
      // Fetch all weeks, ordered by week
      q = query(collection(db, "teamWeekStats"), orderBy("week", "asc"));
    }

    const querySnapshot = await getDocs(q);
    const weekStats: TeamWeekStats[] = [];

    querySnapshot.forEach((doc) => {
      weekStats.push({
        id: doc.id,
        ...doc.data(),
      } as TeamWeekStats);
    });

    return weekStats;
  } catch (error) {
    console.error("Error fetching week stats:", error);
    throw error;
  }
};
