export interface BirthProfile {
    displayName: string;
    birthDate: string;
    birthTime: string;
    birthPlace: string;
    timezone: string;
    birthWeekday: string;
}

export interface PracticeProfile {
    meditationStartedApprox: string;
    currentConsistency: string;
    formerOrdination: string;
    currentPractices: string[];
}

export interface HealthTurningPoint {
    type: string;
    summary: string;
    strategyMeaning: string;
}

export interface RecoveryProfile {
    healthTurningPoints: HealthTurningPoint[];
    recoveryTools: string[];
}

export interface WorkEnergyPattern {
    energizingWork: string[];
    drainingWork: string[];
    preferredWorkModes: string[];
}

export interface PersonalWarningSigns {
    physical: string[];
    mental: string[];
    workPattern: string[];
}

export interface PracticeAnchors {
    shortAnchors: string[];
    eveningAnchors: string[];
}

export interface InterpretationBoundary {
    astrologyStyle: string;
    thaiElementStyle: string;
    chakraStyle: string;
    soundHealingStyle: string;
    spiritualLineageStyle: string;
    medicalBoundary: string;
    disclaimer: string;
}

export interface AstroPersonalProfile {
    birthProfile: BirthProfile;
    practiceProfile: PracticeProfile;
    recoveryProfile: RecoveryProfile;
    workEnergyPattern: WorkEnergyPattern;
    personalWarningSigns: PersonalWarningSigns;
    practiceAnchors: PracticeAnchors;
    interpretationBoundary: InterpretationBoundary;
}

export const MOCK_PERSONAL_PROFILE: AstroPersonalProfile = {
    birthProfile: {
        displayName: "คุณตั้ม",
        birthDate: "1980-06-05",
        birthTime: "06:45",
        birthPlace: "Siriraj Hospital, Bangkok, Thailand",
        timezone: "Asia/Bangkok",
        birthWeekday: "Thursday"
    },
    practiceProfile: {
        meditationStartedApprox: "around 10 months ago",
        currentConsistency: "not fully consistent recently",
        formerOrdination: "3 Buddhist rains",
        currentPractices: [
            "meditation",
            "sound-based relaxation",
            "chakra learning",
            "reflection journaling"
        ]
    },
    recoveryProfile: {
        healthTurningPoints: [
            {
                type: "eye_condition",
                summary: "Sudden eye fluid/swelling episode, treated for around 4 months",
                strategyMeaning: "stress/load awareness"
            },
            {
                type: "respiratory_condition",
                summary: "Asthma / prolonged cough and breathing difficulty episode",
                strategyMeaning: "rest rhythm and workload boundary awareness"
            }
        ],
        recoveryTools: [
            "meditation",
            "calming audio",
            "chakra learning",
            "AI-assisted work organization"
        ]
    },
    workEnergyPattern: {
        energizingWork: [
            "strategic planning",
            "content system design",
            "AI-assisted workflow building",
            "knowledge synthesis",
            "green/nature-related work"
        ],
        drainingWork: [
            "too many open projects at once",
            "urgent context switching",
            "unclear tasks",
            "long screen sessions without breaks"
        ],
        preferredWorkModes: [
            "structure before expansion",
            "one checkpoint at a time",
            "deep work with clear output"
        ]
    },
    personalWarningSigns: {
        physical: [
            "eye strain",
            "shallow breathing",
            "coughing tendency",
            "chest tightness",
            "fatigue"
        ],
        mental: [
            "looping thoughts",
            "too much project switching",
            "urge to fix everything at once",
            "difficulty stopping work"
        ],
        workPattern: [
            "opening too many dev/content tasks",
            "late-night screen work",
            "lack of reflection pause"
        ]
    },
    practiceAnchors: {
        shortAnchors: [
            "3-minute eye rest",
            "5-minute breathing pause",
            "walk near trees",
            "write one reflection note",
            "close one task before opening another"
        ],
        eveningAnchors: [
            "soft audio before sleep",
            "short meditation",
            "phone distance boundary",
            "gentle review of the day"
        ]
    },
    interpretationBoundary: {
        astrologyStyle: "strategic and non-fatalistic",
        thaiElementStyle: "reflective, not diagnostic",
        chakraStyle: "symbolic reflection, not medical claim",
        soundHealingStyle: "relaxation support, not treatment claim",
        spiritualLineageStyle: "respectful, non-dogmatic",
        medicalBoundary: "always defer to qualified healthcare professionals",
        disclaimer: "For personal reflection and planning only. Not medical advice, diagnosis, or treatment."
    }
};
