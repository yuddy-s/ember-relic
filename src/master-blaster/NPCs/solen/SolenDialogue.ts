import { MBProgress, UpgradeId } from "../../Progress/MBProgress";

export interface SolenDialoguePage {
    speaker: string;
    text: string;
}

export interface SolenConversation {
    id: string;
    promptText: string;
    pages: ReadonlyArray<SolenDialoguePage>;
    rewardUpgradeId?: UpgradeId;
    stageIndex?: number;
    advanceStageOnComplete: boolean;
}

const SOLEN_STAGE_CONVERSATIONS: ReadonlyArray<SolenConversation> = Object.freeze([
    {
        id: "solen_intro_lantern",
        promptText: "[E] Speak with Solen",
        rewardUpgradeId: UpgradeId.LANTERN,
        stageIndex: 0,
        advanceStageOnComplete: true,
        pages: Object.freeze([
            {
                speaker: "Solen",
                text: "Easy now. You are safe in the Hearthhold, though I suspect it does not feel like safety yet."
            },
            {
                speaker: "Kael",
                text: "Where am I... and why does any of this feel familiar?"
            },
            {
                speaker: "Solen",
                text: "Because the ruins remember you, even if you do not remember yourself. Vaelundra has been waiting a very long time."
            },
            {
                speaker: "Solen",
                text: "Take this lantern. The warrens ahead swallow every weak flame, but this one still answers to Embersoul."
            },
            {
                speaker: "Solen",
                text: "Go, face the fragment that stirs beyond these halls. Return when one of the false gods falls, and I will tell you more."
            }
        ])
    },
    {
        id: "solen_after_first_boss",
        promptText: "[E] Speak with Solen",
        stageIndex: 1,
        advanceStageOnComplete: true,
        pages: Object.freeze([
            {
                speaker: "Solen",
                text: "You carry the weight of a fallen god now. Did you feel it? The seal answered when that fragment died."
            },
            {
                speaker: "Kael",
                text: "I felt something crack... like it recognized the thing I killed."
            },
            {
                speaker: "Solen",
                text: "Then your path is the right one. The other fragments will not wait quietly. Hunt another, and the truth will come closer."
            }
        ])
    },
    {
        id: "solen_after_second_boss",
        promptText: "[E] Speak with Solen",
        stageIndex: 2,
        advanceStageOnComplete: true,
        pages: Object.freeze([
            {
                speaker: "Solen",
                text: "Two fragments gone. Vaelundra shifts each time you return, as though the city itself is bracing for your memory."
            },
            {
                speaker: "Kael",
                text: "You keep talking like you know who I was."
            },
            {
                speaker: "Solen",
                text: "I do. But names spoken too early can become chains. One more fragment, and the seal will no longer let me hide the worst of it."
            }
        ])
    },
    {
        id: "solen_after_third_boss",
        promptText: "[E] Speak with Solen",
        stageIndex: 3,
        advanceStageOnComplete: true,
        pages: Object.freeze([
            {
                speaker: "Solen",
                text: "The third fragment has fallen. The Hearthhold's sealed door is listening now, even if it still pretends to sleep."
            },
            {
                speaker: "Solen",
                text: "There is a pattern hidden in these stones. Wake it, and the path to the ascent will open."
            },
            {
                speaker: "Solen",
                text: "When you step through that door, there will be no more half-truths left for either of us."
            }
        ])
    },
    {
        id: "solen_after_final_boss",
        promptText: "[E] Speak with Solen",
        stageIndex: 4,
        advanceStageOnComplete: true,
        pages: Object.freeze([
            {
                speaker: "Solen",
                text: "Then it is done. The last ember has answered, and the burden of this age is finally bare."
            },
            {
                speaker: "Solen",
                text: "Whatever you choose beyond this moment, know that Vaelundra was not waiting for a god. It was waiting for someone willing to end one."
            }
        ])
    }
]);

const SOLEN_AMBIENT_CONVERSATION: SolenConversation = Object.freeze({
    id: "solen_ambient_waiting",
    promptText: "[E] Speak with Solen",
    advanceStageOnComplete: false,
    pages: Object.freeze([
        {
            speaker: "Solen",
            text: "The Hearthhold still stands. When you are ready, choose a path and return alive."
        }
    ])
});

export function getPendingSolenConversation(): SolenConversation | null {
    const rawStage = MBProgress.getSolenConversationStage();
    const normalizedStage = rawStage === 0 && MBProgress.hasUpgrade(UpgradeId.LANTERN) ? 1 : rawStage;

    if(normalizedStage >= SOLEN_STAGE_CONVERSATIONS.length){
        return null;
    }

    if(normalizedStage === 0){
        return SOLEN_STAGE_CONVERSATIONS[normalizedStage];
    }

    if(MBProgress.getDefeatedBossCount() >= normalizedStage){
        return SOLEN_STAGE_CONVERSATIONS[normalizedStage];
    }

    return null;
}

export function getSolenConversationForInteraction(): SolenConversation {
    return getPendingSolenConversation() ?? SOLEN_AMBIENT_CONVERSATION;
}
