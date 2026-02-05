import { Market, FrontPageBlueprint, MarketGroup, Headlines, Datelines, ArticleContent, Story } from '../../types';
import { Agent, createAIClient, extractJSON, withRetry, GEMINI_MODELS } from '../lib/agents';

export interface ArticleWriterInput {
    blueprint: FrontPageBlueprint;
    headlines: Headlines;
    datelines: Datelines;
    groupByMarketId?: Map<string, MarketGroup>;
}

export interface ArticleWriterOutput {
    content: ArticleContent;
    editorialNote: string;
}

// Logic to generate a location dateline if one isn't provided
export function generateDateline(market: Market): string {
    const question = market.question.toLowerCase();
    let location = 'NEW YORK';

    if (question.includes('trump') || question.includes('biden') ||
        question.includes('congress') || question.includes('fed') ||
        question.includes('white house')) {
        location = 'WASHINGTON';
    } else if (question.includes('ukraine') || question.includes('russia')) {
        location = 'KYIV';
    } else if (question.includes('israel') || question.includes('gaza')) {
        location = 'JERUSALEM';
    } else if (question.includes('china') || question.includes('taiwan')) {
        location = 'TAIPEI';
    } else if (question.includes('uk') || question.includes('britain')) {
        location = 'LONDON';
    } else if (question.includes('eu') || question.includes('europe')) {
        location = 'BRUSSELS';
    } else if (question.includes('openai') || question.includes('google') ||
        question.includes('apple') || question.includes('meta') ||
        question.includes('ai ')) {
        location = 'SAN FRANCISCO';
    } else if (question.includes('spacex') || question.includes('nasa')) {
        location = 'CAPE CANAVERAL';
    } else if (question.includes('bitcoin') || question.includes('crypto')) {
        location = 'CRYPTO WIRE';
    } else if (question.includes('oscar') || question.includes('movie') ||
        question.includes('hollywood')) {
        location = 'LOS ANGELES';
    }

    let dateStr: string;
    if (market.endDate) {
        const endDate = new Date(market.endDate);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        dateStr = `${months[endDate.getMonth()]} ${endDate.getFullYear()}`;
    } else {
        const future = new Date();
        future.setMonth(future.getMonth() + 1);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        dateStr = `${months[future.getMonth()]} ${future.getFullYear()}`;
    }

    return `${location} (${dateStr})`;
}

/**
 * Pick random item from array using market ID as seed for consistency
 */
function pickRandom<T>(arr: T[], seed: string): T {
    const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return arr[hash % arr.length];
}

/**
 * Generate contextual fallback article when AI fails
 * Uses market data to create relevant, punchy content
 */
function generateFallbackArticle(story: Story): string {
    const odds = Math.round(Math.max(story.yesPrice, story.noPrice) * 100);
    const isYes = story.yesPrice > 0.5;

    const vol = story.volume24hr >= 1e6
        ? `$${(story.volume24hr / 1e6).toFixed(1)} million`
        : story.volume24hr >= 1e3
            ? `$${Math.round(story.volume24hr / 1e3)}K`
            : `$${story.volume24hr.toFixed(0)}`;

    const layout = story.layout || 'BRIEF';

    if (layout === 'BRIEF') {
        return pickRandom(getBriefTemplates(odds, vol), story.id);
    } else if (layout === 'FEATURE') {
        return pickRandom(getFeatureTemplates(odds, vol), story.id);
    } else {
        return pickRandom(getLeadTemplates(odds, vol), story.id);
    }
}

function getBriefTemplates(odds: number, vol: string): string[] {
    if (odds >= 85) {
        // VICTORY LAP - It happened. Celebrate or mourn.
        return [
            `Done. Finished. ${odds}% and counting. The ${vol} screamed it from the rooftops.`,
            `It's over. The bulls won. ${vol} proved everyone right.`,
            `Bears in shambles. ${odds}% says it all. Pack it up.`,
            `The verdict is in: ${odds}%. ${vol} sealed the deal. Next question.`,
            `Called it. Nailed it. Banked it. ${odds}% locked.`,
            `Champagne corks. Crying traders. One number: ${odds}%.`,
            `The dust settles. The winners count their gains. ${vol} on the table.`,
            `History made. ${odds}% certainty. ${vol} in volume. The end.`,
            `They laughed. Then ${vol} flowed in. Who's laughing now?`,
            `${odds}%. That's it. That's the story. Move on.`,
            `The contrarians went quiet. ${odds}% will do that.`,
            `Lock it in. Frame it. ${odds}% for the history books.`,
            `Not even close. ${odds}% crushed all doubt.`,
            `The math doesn't care about your feelings: ${odds}%.`,
            `Inevitable. Unstoppable. ${odds}%. ${vol} confirmed it.`,
            `Game. Set. Match. ${odds}% ends all arguments.`,
            `The story wrote itself. ${odds}% was just the headline.`,
            `Fait accompli. ${odds}%. The ${vol} was just a formality.`,
            `Zero suspense. ${odds}% from start to finish.`,
            `The only surprise? That anyone doubted it. ${odds}%.`,
        ];
    } else if (odds >= 70) {
        // STRONG CONVICTION - Victory secured, but acknowledge the fight
        return [
            `The lead held. ${odds}% locked in. ${vol} backed the winner.`,
            `It's done. Not a blowout, but a win. ${odds}% sealed it.`,
            `The favorite delivered. ${odds}%. ${vol} on the right side.`,
            `Doubters silenced. ${odds}% speaks louder than words.`,
            `The momentum was real. ${odds}% proved it. ${vol} rewarded.`,
            `Clear winner. ${odds}%. The ${vol} knew all along.`,
            `Conviction paid off. ${odds}% delivers for the believers.`,
            `The path was bumpy. The destination was ${odds}%.`,
            `Strong finish. ${odds}%. The ${vol} made the right call.`,
            `Not a landslide, but decisive. ${odds}% writes the ending.`,
            `The smart money was right again. ${odds}%. ${vol} in pocket.`,
            `Close enough to sweat, far enough to win. ${odds}%.`,
            `Victory secured at ${odds}%. ${vol} celebrates tonight.`,
            `The favorite held serve. ${odds}% closes the book.`,
            `Earned, not given. ${odds}% tells the story.`,
            `The lead never wavered. ${odds}% from wire to wire.`,
            `Pressure tested. ${odds}% passed. ${vol} vindicated.`,
            `The thesis played out. ${odds}% is the final grade.`,
            `Solid. Steady. ${odds}%. The ${vol} got it right.`,
            `No miracles needed. ${odds}% was always enough.`,
        ];
    } else if (odds >= 55) {
        // NAIL-BITER - Photo finish energy
        return [
            `Down to the wire. ${odds}% decided it. Barely.`,
            `Photo finish. ${odds}% was the margin of victory.`,
            `Sweat-soaked traders, ${odds}% relief. That was close.`,
            `The narrowest win. ${odds}%. Hearts were pounding.`,
            `Squeaker. ${odds}% after a white-knuckle ride.`,
            `They held on. Barely. ${odds}% by a thread.`,
            `The edge held. ${odds}%. ${vol} exhales.`,
            `Too close for comfort. ${odds}% got it done.`,
            `Nail-biter resolved at ${odds}%. Sleep well tonight.`,
            `The margin was nothing. The win was everything. ${odds}%.`,
            `Survived. ${odds}%. The ${vol} nearly had heart attacks.`,
            `One tick away from chaos. ${odds}% delivered.`,
            `The longest final minute. ${odds}% at the buzzer.`,
            `Almost wasn't. Then was. ${odds}%.`,
            `The slim lead became a slim win. ${odds}%.`,
            `Fingers crossed until ${odds}% made it official.`,
            `Sweaty palms, ${odds}% relief. Done.`,
            `The thinnest of margins. ${odds}%. It counts.`,
            `Could've gone either way. Went ${odds}%.`,
            `Drama until the last second. ${odds}% ends it.`,
        ];
    } else if (odds >= 45) {
        // COIN FLIP - Maximum tension, then resolution
        return [
            `Coin flip landed. ${odds}%. Someone's celebrating.`,
            `Dead heat decided. ${odds}% broke the tie.`,
            `The toss-up resolved. ${odds}%. Nobody was sure.`,
            `50-50 no more. ${odds}% picked a side.`,
            `The gridlock broke. ${odds}% claims victory.`,
            `Everyone held their breath. ${odds}% exhaled.`,
            `The split resolved at ${odds}%. One side wins.`,
            `Pure uncertainty became ${odds}% certainty.`,
            `The stalemate ended. ${odds}%. History moves on.`,
            `When in doubt, ${odds}% figured it out.`,
            `The deadlock shattered. ${odds}% stands alone.`,
            `Neither side blinked. ${odds}% decided anyway.`,
            `The world's longest coin flip: ${odds}%.`,
            `Chaos crystallized into ${odds}%. Order restored.`,
            `The knife's edge dulled. ${odds}% won out.`,
            `Overtime finished. ${odds}%. What a ride.`,
            `The great debate settled at ${odds}%.`,
            `Schrodinger's market collapsed to ${odds}%.`,
            `The tie-breaker: ${odds}%. Final answer.`,
            `Two sides entered. ${odds}% left standing.`,
        ];
    } else {
        // UPSET - The impossible happened
        return [
            `Nobody saw this coming. Then it happened. ${odds}%.`,
            `Upset for the ages. ${odds}% shocked the world.`,
            `The long shot landed. ${odds}%. Believers rejoice.`,
            `They said impossible. ${odds}% disagreed.`,
            `The contrarians were right. ${odds}%. Take a bow.`,
            `Miracle? Call it what you want. ${odds}%.`,
            `The underdog bit back. ${odds}%. Stunning.`,
            `Against all odds. Literally. ${odds}%.`,
            `The faithful kept faith. ${odds}% rewarded them.`,
            `Plot twist: ${odds}%. Nobody predicted this.`,
            `The unthinkable became ${odds}% reality.`,
            `Long odds, short memory. ${odds}% silences critics.`,
            `They never gave up. ${odds}% proves it.`,
            `The comeback story of the year: ${odds}%.`,
            `Improbable became inevitable. ${odds}%.`,
            `The market got it wrong. ${odds}% got it right.`,
            `Stunning reversal. ${odds}%. Jaws on floor.`,
            `David beat Goliath. ${odds}% is the headline.`,
            `The biggest upset since... well, this: ${odds}%.`,
            `Sometimes the long shot hits. ${odds}%. Today.`,
        ];
    }
}

function getFeatureTemplates(odds: number, vol: string): string[] {
    if (odds >= 85) {
        // VICTORY STORY - Celebrate the win, document the carnage
        return [
            `It's done. ${odds}%. The bulls called it, the bulls won it, and ${vol} proved they weren't just talking.

Make no mistake: this wasn't close. The contrarians got absolutely demolished. Anyone still holding the other side watched their positions evaporate like morning fog.

What happens next? The victory lap. The told-you-so tweets. The smart money already rotated to the next question while the losers were still processing their L.`,

            `They said it couldn't happen. Then it did. ${odds}% certainty, ${vol} in volume, and a whole lot of humble pie for the doubters.

Here's the thing about prediction markets: they don't care about your narrative. They don't care about your credentials. They care about being right. And at ${odds}%, someone was very, very right.

The aftermath is already playing out. Winners are collecting. Losers are coping. The next chapter starts now.`,

            `${odds}%. Let that sink in. ${vol} flowed into this market, and the verdict came back unanimous.

The bears got crushed. Not "lost narrowly." Not "put up a good fight." Crushed. The kind of defeat that ends trading careers and spawns revenge trades.

For the winners? Pop the champagne. For the losers? There's always the next market. Probably.`,

            `History made. ${odds}% locked. ${vol} sealed it. The end.

What we witnessed wasn't a market. It was a coronation. The favorite dominated from start to finish, and everyone who bet against the tide learned an expensive lesson.

The story is over. The only question left: what comes next?`,

            `The receipts are in: ${odds}%. Remember when they doubted? Remember the hot takes? The ${vol} remembers. The winners remember.

This is what vindication looks like. Not a squeaker. Not a photo finish. A blowout. A statement. A market that said "we know" and then proved it.

Somewhere, a trader who held from the beginning is very, very happy right now.`,

            `Done. Dusted. Demolished. ${odds}% is the final score, ${vol} was the ammunition.

The contrarian thesis died today. Not peacefully in its sleep—violently, publicly, expensively. The market showed no mercy because markets never do.

On to the next one. The winners are already there.`,

            `The math was never in doubt. ${odds}%. The ${vol} just made it official.

Winners win. Losers learn. That's the market. That's always been the market. Today's lesson was taught at ${odds}% certainty.

Class dismissed.`,

            `${odds}% certainty. ${vol} in volume. Zero ambiguity.

The betting thesis worked. The conviction paid off. The doubters got exactly what they deserved: a front-row seat to being wrong.

Time to collect. Time to celebrate. Time to find the next opportunity.`,

            `Absolute domination. ${odds}% from wire to wire. ${vol} backing the inevitable.

This wasn't a contest—it was a statement. The market knew. The smart money knew. Now everyone knows.

The victory lap begins. The post-mortems can wait.`,

            `They fought the market. The market won. ${odds}% is the tombstone on the contrarian position.

${vol} in volume. That's a lot of money on the right side, and a lot of pain on the wrong side. Markets are zero-sum. Today's sum was ${odds}%.

Game over. New game loading.`,

            `The impossible was always inevitable. ${odds}% confirms what the believers knew all along.

${vol} didn't lie. The volume never lies. It just takes time for reality to catch up to what the money already understood.

Victory. Complete. Undeniable.`,

            `${odds}%. Say it again. Let it sink in for the doubters.

The market spoke. Then it screamed. Then it engraved the verdict in ${vol} worth of certainty.

There are no moral victories in prediction markets. Only winners and losers. Today made that very clear.`,

            `From "maybe" to "definitely" to "${odds}% guaranteed." That's the trajectory. That's the story. That's ${vol} worth of conviction paying off.

The holdouts surrendered. The skeptics converted. The market reached consensus the hard way—by being undeniably, provably right.

Collect the winnings. Close the books. Start the next chapter.`,

            `The thesis held. The bet paid. ${odds}% writes the ending that everyone saw coming but some refused to accept.

${vol} in volume confirms this wasn't speculation—it was execution. The plan worked. The market delivered.

Winners win. Rinse. Repeat.`,

            `Certainty achieved. ${odds}%. ${vol}. Zero remaining doubt.

This is what happens when the favorite is actually the favorite. When the odds are right. When the market gets it.

The celebration is deserved. The analysis is over. On to tomorrow.`,
        ];
    } else if (odds >= 70) {
        // STRONG WIN - Acknowledge the fight, celebrate the victory
        return [
            `The favorite delivered. ${odds}% odds, ${vol} in volume, and a win that felt inevitable even when it wasn't certain.

Here's the thing: ${100 - odds}% is still real probability. People lost money betting against this. But the market ultimately got it right, which is what markets do more often than not.

The win column fills up. The losers lick wounds. The eternal cycle continues.`,

            `${odds}% isn't a landslide, but it's a win. ${vol} backed the right horse, and tonight someone's counting profits while someone else deletes their trading app.

The margin matters less than the outcome. Right is right. Wrong is wrong. The market sorted it out.

Victory secured. Moving on.`,

            `Not a blowout. Not a nail-biter. Just a solid, respectable ${odds}% win backed by ${vol} in conviction.

The favorite held serve. No drama. No late-game heroics needed. Just steady execution from start to finish.

This is what winning looks like when you do it right.`,

            `${odds}% with ${vol} behind it. The thesis worked. Not perfectly, not overwhelmingly, but it worked.

The contrarians put up a fight. Give them credit. But credit doesn't pay the bills—being right does. And ${odds}% is right enough.

Collect. Recalibrate. Continue.`,

            `The lead never collapsed. ${odds}% holds. ${vol} validates.

There were moments of doubt—there always are. But the smart money stayed steady, and steady won the race.

The reward for patience: being on the right side of ${odds}%.`,

            `Conviction tested. Conviction proven. ${odds}% certainty earned the hard way.

${vol} flowed through this market, and the consensus held. Not every bet pays, but this one did.

The winners earned it. The losers learned from it. Markets working as designed.`,

            `${odds}%. Clean win. ${vol} backed it.

No asterisks. No controversy. Just the market doing what the market does—finding the right answer and rewarding those who found it first.

Simple. Effective. Profitable.`,

            `The favorite won like a favorite should: decisively enough at ${odds}%, with ${vol} to prove it wasn't a fluke.

Some wins are ugly. This one was textbook. Read the market, trust the market, profit from the market.

Another one in the books.`,

            `${odds}% certainty after ${vol} in trading. The skeptics had their shot. They missed.

Not every position needs to be a homerun. Singles win games too. This was a solid single—${odds}% odds, cash in pocket.

Fundamentals work. Who knew.`,

            `Momentum held. ${odds}% delivered. ${vol} celebrated.

The path here wasn't always smooth, but the destination was right. That's what matters in markets. Being right at the end.

Victory. Clean and clear.`,

            `The ${100 - odds}% crew had hope. Hope doesn't trade well. ${odds}% does.

${vol} in volume, and the majority was right. Not glamorous. Not dramatic. Just correct.

The market rewarded the favorite. As it often does. As it should.`,

            `From conviction to confirmation: ${odds}%. ${vol} tracked the journey.

Betting favorites isn't exciting. But exciting doesn't pay rent. ${odds}% certainty does.

The smart money stays boring. The smart money stays profitable.`,

            `${odds}% odds materialized into ${odds}% reality. Funny how that works.

${vol} bet on probability. Probability delivered. The math mathed.

Winners: smiling. Losers: recalculating. Markets: functioning.`,

            `Textbook win. ${odds}% expected. ${odds}% delivered. ${vol} validated.

Not every market produces fireworks. Some just produce profits. This was the profitable kind.

Solid. Steady. Successful.`,

            `The thesis survived stress-testing. ${odds}% confirms. ${vol} endorses.

Every market has doubters. This one had ${100 - odds}% worth. They were wrong. The majority was right.

Tale as old as trading.`,
        ];
    } else if (odds >= 55) {
        // NAIL-BITER - Photo finish drama, sweaty palms
        return [
            `This one went to the wire. ${odds}% doesn't tell you about the heart palpitations, the 3 AM refreshes, the "please just end" prayers.

${vol} wagered, and for most of that money, this was pure stress. The margin was nothing. The stakes were everything.

Someone won by a hair. Someone lost by a hair. Same market, opposite realities.`,

            `Photo finish. ${odds}% is the margin of victory, and ${vol} was riding on every percentage point.

The losers have a right to feel cheated. They don't, technically—the market was fair. But ${100 - odds}% isn't nothing. It's almost winning.

Almost doesn't pay though.`,

            `Nail. Biter. ${odds}% after ${vol} in trading and approximately infinity stress.

This is the market at its most brutal: close enough to seem winnable for everyone, painful enough to hurt the losers deeply.

The edge held. Barely. But barely counts.`,

            `The slimmest of victories: ${odds}%. The traders who held this position deserve a spa day and a drink. Or several drinks.

${vol} in volume, and none of it was comfortable money. Every tick mattered. Every update changed everything.

The win column doesn't show the suffering. Only the result.`,

            `Squeaker. ${odds}% victory. ${vol} in white-knuckle trading.

The winners aren't celebrating so much as recovering. The losers aren't grieving so much as questioning everything.

This is what "close" looks like in market terms.`,

            `${odds}% is a win. It doesn't feel like a win. It feels like surviving a car crash. But it's a win.

${vol} traded through this, and most of it was pure anxiety converted to dollar signs. The margin was thin. The money was real.

Exhale. Collect. Never do this again. (Do it again.)`,

            `Down to the wire doesn't capture it. ${odds}% after what felt like years of uncertainty.

${vol} in volume, each dollar representing someone's conviction that they were right. Half of them were. Half of them weren't.

The half that was right is very tired but very happy.`,

            `The closest of calls: ${odds}%. ${vol} on the line.

Prediction markets promise clarity. This one delivered clarity at the last possible second, after maximum possible drama.

Someone's portfolio thanks the market gods tonight.`,

            `Heart attack energy: ${odds}% win, ${vol} in trading, approximately zero calm traders.

The edge existed. It was real. It held. That's three miracles if you were sweating this one.

The win is in. The therapy bills are pending.`,

            `${odds}% by the skin of their teeth. ${vol} worth of bets came down to almost nothing.

This is gambling at its purest: conviction tested, nerves shattered, bank accounts rearranged by the narrowest of margins.

The winners won. But everyone needs a nap.`,

            `Photo finish resolved at ${odds}%. ${vol} exhales collectively.

There are no style points in prediction markets. A win by one tick is a win. But this win aged several traders by several years.

Profit is profit. Even when it costs you your youth.`,

            `Barely. Just barely. ${odds}% barely.

${vol} traded and the margin was thin enough to cut paper. One side claimed victory. The other side has legitimate grievances.

Markets are cold. Markets don't care about "almost."`,

            `${odds}% certainty after ${vol} in near-uncertainty. The turnaround that wasn't quite a turnaround, the collapse that wasn't quite a collapse.

Somewhere between victory and defeat, this market found ${odds}%. Both sides feel robbed. Only one side is right.

The result stands. The feelings don't matter.`,

            `This close shouldn't be legal: ${odds}%. ${vol} in suffering.

The traders who called this correctly deserve medals. The traders who missed it deserve therapy. Both groups need rest.

On to the next coin flip disguised as a market.`,

            `Edge: confirmed. Nerves: destroyed. Result: ${odds}%.

${vol} in volume all came down to the thinnest of margins. This is prediction markets at their most sadistic.

Win secured. Sanity pending.`,
        ];
    } else {
        // UPSET - The impossible happened, celebrate the chaos
        return [
            `Nobody saw this coming. That's the honest truth. ${odds}% was the long-shot that landed, and ${vol} worth of contrarians just became very rich.

The consensus was wrong. Not a little wrong—fundamentally wrong. The smart money wasn't smart. The favorites weren't favored correctly.

This is the market humbling everyone who thought they understood it.`,

            `Upset for the ages: ${odds}%. Somewhere, a trader who everyone mocked is composing a very smug tweet.

${vol} in volume, most of it on the wrong side. The majority got crushed. The minority got wealthy.

Prediction markets aren't predictable. That's... kind of the point.`,

            `They said impossible. The market said ${odds}%. Someone owes someone an apology, and someone else owes someone a very large check.

${vol} traded through this, and the contrarians—the crazy ones, the stubborn ones, the ones everyone dismissed—were right.

This is the stuff of trading legends.`,

            `${odds}%. Read it again. The underdog won. The favorites lost. ${vol} changed hands in the wrong direction.

There will be post-mortems. There will be finger-pointing. There will be questions about what everyone missed.

For now, just appreciate the chaos.`,

            `The long shot landed at ${odds}%. ${vol} in volume, most of it now belonging to the people nobody believed.

This is why we have prediction markets: because sometimes the unlikely happens, and someone should profit from being right when everyone else was wrong.

Tonight, those someones are celebrating.`,

            `Plot twist: ${odds}%. The narrative collapsed. The thesis failed. The sure thing wasn't.

${vol} in trading, and the market made a mockery of certainty. The traders who held the contrarian view through mockery and doubt are vindicated.

Sometimes the crazy ones are just... right.`,

            `The unthinkable became the inevitable at ${odds}%. ${vol} documents the carnage.

This isn't supposed to happen. The odds said it wouldn't. But here we are, watching the underdog victory that will be studied in trading courses for years.

Markets humble. That's what markets do.`,

            `Stunning. ${odds}%. ${vol}. Everyone who was "certain" needs new certainty calibration.

The favorite fell. The underdog rose. The prediction market reminded everyone that probability isn't destiny.

The winners are few. The winners are ecstatic.`,

            `The comeback story wrote itself at ${odds}%. ${vol} in volume, and the minority took the majority's lunch money.

There were signs. There are always signs. Nobody read them. The market did, eventually, at the worst possible time for the favorites.

Upsets make markets honest.`,

            `${odds}% victory for the position nobody respected. ${vol} in volume that's now being redistributed from the confident to the contrarian.

This is the trade that traders dream about: everyone against you, conviction unshaken, wallet eventually overflowing.

Legendary status achieved.`,

            `The impossible happened: ${odds}%. The ${vol} that flowed the wrong way is learning an expensive lesson about certainty.

Prediction markets exist because the world is uncertain. Today, uncertainty won. Big time.

The analysts are scrambling. The contrarians are celebrating.`,

            `Against all odds—literally—the ${odds}% outcome materialized. ${vol} in bets went the wrong way for most.

This is the market at its most humbling: a reminder that probability is not destiny, that consensus can be catastrophically wrong.

Someone's yacht fund just got a major boost.`,

            `The believers believed. ${odds}% vindicates them. ${vol} compensates them.

When everyone zigs, someone has to zag. Today, the zaggers won. Won big. Won historically.

The lesson: sometimes the minority is just correct.`,

            `Miracle? Fluke? ${odds}% upset? Call it what you want. ${vol} calls it "wealth transfer to the prescient."

The market got this wrong. Dramatically wrong. The people who were right are too busy counting money to gloat.

Probably. They might gloat too.`,

            `The thesis everyone dismissed: validated at ${odds}%. The contrarian play: paid at ${vol}.

This is the trade you tell your grandchildren about. The one where you saw what nobody else saw and held while the world laughed.

Last laugh: secured.`,
        ];
    }
}

function getLeadTemplates(odds: number, vol: string): string[] {
    // LEAD STORY templates - Maximum drama, tabloid energy, front page stuff
    return [
        `THEY DID IT. After months of doubt, weeks of drama, and ${vol} in trading volume, the verdict is in: ${odds}% certainty.

The bulls won. The bears lost. The smart money got smarter. The dumb money got education. That's how markets work, and this market worked overtime.

Let's be clear about what happened here: the consensus formed, the consensus held, and the consensus collected. Every trader who went against the grain is now explaining to someone—spouse, partner, mirror—why they were so sure about something so wrong.

The implications cascade outward. Adjacent markets are already repricing. The second-order effects are materializing. The winners are rotating into new positions while the losers are still processing the L.

${odds}% doesn't leave much room for alternative narratives. The story wrote itself, and that story was: bet with the favorite, collect the profit, move on to the next opportunity.

For the historians: this is how a prediction market is supposed to work. Signal emerges from noise. Capital flows to conviction. Reality eventually agrees with probability.

The celebration is deserved. The post-mortem is unnecessary. ${odds}% is ${odds}%. The end.`,

        `NOBODY. SAW. THIS. COMING. Or maybe some did—the ${100 - odds}% who are now very, very wealthy.

${odds}% odds. ${vol} in volume. And a lesson in humility that the prediction market will remember for years.

The favorite collapsed. The underdog rose. The sure thing wasn't. Every analyst, every expert, every "obvious" take got obliterated by the only thing that matters: the outcome.

This is the upset that rewrites the rulebook. The contrarians—the stubborn, the crazy, the ones everyone dismissed—held their positions through mockery and margin calls. They held because they saw something. And what they saw was ${odds}%.

The carnage is extensive. The winners are few. The stories will be legendary.

There will be recriminations. There will be soul-searching. There will be a lot of traders asking themselves how they missed what now seems obvious in hindsight.

But hindsight is easy. Conviction is hard. The people who had conviction when it was unpopular are the people popping champagne tonight.

The market humbles everyone eventually. Today was eventually.`,

        `THE RECKONING ARRIVED. ${odds}%. ${vol}. And a whole lot of traders learning expensive lessons about certainty.

Here's the thing about prediction markets: they don't care about your credentials. They don't care about your analysis. They don't care about your certainty. They care about being right.

At ${odds}%, someone was right. Very right. Expensively right for them, expensively wrong for everyone else.

The path to this moment was messy. Early volatility. Competing narratives. The kind of chaos that makes prediction markets fascinating and terrifying in equal measure.

But chaos resolved into clarity, and clarity resolved into ${odds}%. That's the number. That's the verdict. That's the story.

The winners earned their victory. Not through luck—through conviction held when conviction was uncomfortable. Through analysis that contradicted consensus. Through the courage to be wrong publicly until they were right.

The losers? They learned. Markets are expensive teachers, but they're effective ones.

Whatever comes next, this outcome will be remembered. ${odds}%. ${vol}. History.`,

        `IT HAPPENED AT THE MOMENT NOBODY EXPECTED. One trade. Then another. Then the cascade.

${odds}% certainty. ${vol} in volume. And a market that went from "maybe" to "definitely" in the time it takes to refresh a browser.

The turning point will be analyzed for years. The traders who were positioned correctly will tell this story forever. The traders who weren't will remember it just as long, for very different reasons.

This is prediction markets at their most dramatic: the moment when probability collapses into reality, when all the speculation ends, when someone wins and someone loses and the ledger balances.

The stakes were enormous. ${vol} doesn't flow into casual questions. This was the question—the one everyone was watching, the one that would reshape everything downstream.

And now it's answered. ${odds}%. Final. Irrevocable.

The implications ripple outward. Other markets adjust. Positions get closed. New opportunities emerge from the ashes of old certainties.

This is the cycle. This is always the cycle. Today's resolution becomes tomorrow's baseline becomes next week's ancient history.

But right now? Right now, ${odds}% is everything.`,

        `WINNERS ON ONE SIDE. LOSERS ON THE OTHER. ${odds}% IN BETWEEN.

The market has spoken, and it spoke in ${vol} worth of conviction. There's no ambiguity here. No room for interpretation. Just a number and its consequences.

Let the record show: on this day, at this moment, the prediction market rendered its verdict. ${odds}% probability materialized into 100% outcome.

The winners know who they are. They're the ones who saw the trend before it was obvious, who held the position when it was painful, who trusted their analysis over the crowd's consensus.

The losers know who they are too. They're the ones who'll spend the next week running counterfactuals, asking "what if," wondering whether there was a signal they missed.

Spoiler: there probably was. There usually is. The market usually knows before we do—that's why it's the market.

${vol} is a lot of money. It represents a lot of conviction, a lot of analysis, a lot of sleepless nights and stress-refreshing browsers. All of it resolved into ${odds}%.

The story is over. The next story begins. The market never stops.`,

        `LET THE RECORD SHOW: on this day, it was settled. ${odds}% certainty. ${vol} in volume. Zero remaining questions.

The debate is over. The speculation ends. The "what-ifs" become "what-wases." This is how prediction markets close chapters—decisively, expensively, permanently.

The path here was anything but certain. There were moments of doubt. Moments when the other side had momentum. Moments when ${odds}% seemed like a fantasy.

But the fantasy became reality. The probability became outcome. The market did what markets do: found the truth and made people pay for being wrong about it.

The winners earned this. Through research, through conviction, through the courage to put capital behind their beliefs when those beliefs were unpopular.

The losers earned this too, in a different way. Every wrong position is a lesson. Every loss is tuition. The market educates everyone eventually.

${odds}%. ${vol}. These numbers will echo through trading floors and Discord servers and group chats. They'll become shorthand for this moment—the moment when everyone learned who was right.

History recorded. Chapter closed. Next page loading.`,

        `THE DUST SETTLES. THE NUMBERS ARE FINAL. ${odds}% wins. ${vol} changes hands.

This is what resolution looks like in prediction markets: not a whisper, but a verdict. Not a suggestion, but a statement. The outcome is in, and the outcome doesn't care about your feelings.

For the winners, this is validation. Every doubter silenced. Every skeptic refuted. Every moment of uncertainty justified by the only metric that matters: being right.

For the losers, this is education. Expensive education. The kind that sticks because it costs something. Next time—if there is a next time—the analysis will be sharper.

The market functioned. That's the meta-story. Thousands of traders, millions of data points, ${vol} in capital, all synthesized into a single probability that turned out to be... right.

That's not nothing. In a world of noise and uncertainty, the market found signal. The crowd, in its collective wisdom, got this one correct.

${odds}% is the headline. But the real story is the system that produced it: chaotic, competitive, occasionally cruel, but ultimately effective at finding truth.

The truth is in. The market moves on. The cycle continues.`,

        `HISTORY MADE. No asterisks. No qualifications. Just ${odds}% certainty and ${vol} in proof.

Some outcomes are ambiguous. This one isn't. The market delivered a verdict so clear it might as well have been written in neon: THIS HAPPENED.

The winners are celebrating. The losers are coping. The analysts are already writing post-mortems that will be ignored until the next time everyone gets it wrong.

What made this outcome special wasn't just the probability—it was the journey. The volatility. The competing narratives. The moments when it could have gone either way.

But it went this way. ${odds}% this way. And now that's the only reality that matters.

${vol} in trading volume represents conviction at scale. Not retail gamblers—serious capital making serious statements about serious questions. The market weight behind this number is undeniable.

For prediction market enthusiasts, this is validation. The system works. Not perfectly—it never works perfectly—but well enough to find truth when truth is findable.

For everyone else? This is a reminder that the future isn't as uncertain as it feels. Sometimes the smart money is actually smart. Sometimes probability is destiny.

Today, ${odds}% was destiny.`,

        `THE IMPOSSIBLE WAS ALWAYS INEVITABLE. We just couldn't see it until ${odds}% made it undeniable.

${vol} in volume. Thousands of traders. Millions of data points. All converging on a single outcome that, in hindsight, was obvious. It's always obvious in hindsight.

The story of this market is the story of consensus forming in real-time. Early chaos giving way to emerging pattern. Emerging pattern crystallizing into conviction. Conviction becoming ${odds}%.

The losers had their thesis. It was plausible. It was reasoned. It was wrong. The market doesn't grade on effort—it grades on outcome. And the outcome is in.

The winners had their thesis too. It was also plausible. Also reasoned. But it was right, and right is the only thing that matters when the ledger closes.

This is the brutal beauty of prediction markets: no participation trophies. No moral victories. Just winners and losers, separated by the thinnest of margins or the widest of chasms.

${odds}% is a chasm. One side is celebrating. The other side is recalibrating.

The market never stops. But this moment—${odds}%, ${vol}, history—deserves a pause. A recognition. A record for the ages.

Done.`,

        `THE VERDICT CAME DOWN LIKE A HAMMER. ${odds}%. ${vol}. Devastation for some. Vindication for others.

Markets exist to answer questions. This market answered its question with prejudice. No ambiguity. No "basically" or "probably" or "it depends." Just cold, hard, ${odds}%.

The traders who called this—who saw it coming when others scoffed—are the protagonists of tonight's story. They read the signals. They trusted their analysis. They held the position.

The traders who missed it are the cautionary tale. Not because they were stupid—they weren't—but because they were wrong. And wrong is wrong, regardless of how sophisticated the reasoning behind it.

${vol} is real money. When you're on the right side of ${vol}, life is good. When you're on the wrong side, life is expensive. The market creates these realities without sentiment or mercy.

The implications cascade. Other questions get repriced. Correlations strengthen or break. The entire prediction market ecosystem absorbs this ${odds}% and adjusts.

But in this moment, before the next question becomes urgent, pause to appreciate what happened here: the future got less uncertain. A question got answered. The market worked.

${odds}%. Remember it.`,
    ];
}

// TODO: In the future, use groupInfo to display multi-outcome markets
// e.g., "Trump 65%, Harris 32%, RFK 3%" instead of just the primary market
function formatMarketForJournalist(
    market: Market,
    headline: string,
    dateline: string
): string {
    const yesWinning = market.yesPrice > 0.5;
    const leadingOutcome = yesWinning ? market.outcomes[0] : market.outcomes[1];
    const leadingOdds = Math.round(Math.max(market.yesPrice, market.noPrice) * 100);

    const vol = market.volume24hr >= 1e6
        ? `$${(market.volume24hr / 1e6).toFixed(1)}M`
        : `$${(market.volume24hr / 1e3).toFixed(0)}K`;

    const statusContext = {
        confirmed: leadingOdds >= 85 ? 'CERTAIN' : 'LIKELY',
        dead_on_arrival: 'REJECTED',
        chaos: 'VOLATILE',
        contested: 'CONTESTED',
    }[market.marketStatus];

    return `ID: "${market.id}"
HEADLINE: "${headline}"
MARKET: "${market.question}"
DATELINE: ${dateline}
ODDS: ${leadingOutcome} ${leadingOdds}% (${statusContext})
VOLUME: ${vol}`;
}

export class ArticleWriterAgent implements Agent<ArticleWriterInput, ArticleWriterOutput> {
    constructor(private apiKey: string) { }

    async call(input: ArticleWriterInput): Promise<ArticleWriterOutput> {
        const { blueprint, headlines, datelines, groupByMarketId } = input;
        const stories = blueprint.stories;

        const allSections = stories.map((market, index) => {
            const headline = headlines[market.id] || market.question;
            const dateline = datelines[market.id] || generateDateline(market);

            // Format with description for AI context
            const baseText = formatMarketForJournalist(market, headline, dateline);
            const contextText = market.description
                ? `\nCONTEXT/DESCRIPTION: "${market.description.replace(/\n/g, ' ').substring(0, 300)}..."`
                : '';

            // Updated for 50 stories: 1 LEAD (250w), 8 FEATURE (120w), 41 BRIEF (40w)
            const layoutInstruction = `\nLAYOUT TYPE: ${market.layout} (Length: ${market.layout === 'LEAD_STORY' ? '250 words'
                : market.layout === 'FEATURE' ? '120 words'
                    : '40 words'})`;

            if (index < 3) console.log(`Debug Context [${market.id}]:`, contextText);

            return {
                id: market.id,
                index,
                text: baseText + contextText + layoutInstruction
            };
        });

        // Batch processing - optimized for 50 stories
        // BRIEF stories are short (40 words), so we can batch more
        const BATCH_SIZE = 5;
        const batches = [];
        for (let i = 0; i < allSections.length; i += BATCH_SIZE) {
            batches.push(allSections.slice(i, i + BATCH_SIZE));
        }

        console.log(`Article Writer: Processing ${stories.length} stories in ${batches.length} batches...`);

        const client = createAIClient(this.apiKey);
        const finalContent: ArticleContent = {};
        let finalEditorialNote = "The future is unevenly distributed.";

        await Promise.all(batches.map(async (batch, batchIdx) => {
            // Stagger batch starts to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, batchIdx * 250));

            // Build simplified input for Gemini
            const batchInput = batch.map((s, localIdx) => {
                const globalIdx = batchIdx * BATCH_SIZE + localIdx;
                return `[${globalIdx}] ${s.text}`;
            }).join('\n\n---\n\n');

            const batchPrompt = `You are writing for "The Polymarket Times" — a TABLOID from TOMORROW.

═══════════════════════════════════════════════════════════
CRITICAL: YOU ARE A TIME TRAVELER FROM TOMORROW
═══════════════════════════════════════════════════════════
Write as if the likely outcome ALREADY HAPPENED:
- Markets >70%: Declare VICTORY. Past tense. "The bulls won."
- Markets 50-70%: NAIL-BITER energy. "Down to the wire."
- Markets <50%: STUNNING UPSET. "Nobody saw this coming."

═══════════════════════════════════════════════════════════
STORIES TO COVER:
═══════════════════════════════════════════════════════════
${batchInput}

═══════════════════════════════════════════════════════════
ARTICLE STRUCTURE (VERDICT → PROOF → CONSEQUENCES):
═══════════════════════════════════════════════════════════

1. **VERDICT** (First sentence)
   Declare what happened. Past tense. Confident.
   - BAD: "Markets are pricing Bitcoin at 75%..."
   - GOOD: "Bitcoin smashed through $100K. The bulls were right. The bears got crushed."

2. **PROOF** (2-3 sentences)
   The numbers that seal it. Drama, not analysis.
   - "The odds locked at 85%. The volume screamed $12M."
   - "Nobody believed. Then everyone believed. Then it happened."

3. **CONSEQUENCES** (1-2 sentences)
   Winners and losers. Who's celebrating? Who's crying?
   - "The doubters owe apologies. The believers deserve champagne."
   - "Somewhere, a trader who held through the chaos is very, very rich."

═══════════════════════════════════════════════════════════
LAYOUT-SPECIFIC INSTRUCTIONS:
═══════════════════════════════════════════════════════════
- **LEAD_STORY** (250 words): FRONT PAGE ENERGY. Maximum drama.
  "THEY DID IT." "IT'S OVER." "HISTORY MADE."

- **FEATURE** (120 words): The story behind the story.
  Winners and losers. Drama and vindication.

- **BRIEF** (40 words): Mic drop. 2-3 punchy sentences.
  "Done. Finished. 85% locked it in."

═══════════════════════════════════════════════════════════
TONE: NEW YORK POST MEETS WSB
═══════════════════════════════════════════════════════════
- Punchy, not ponderous
- Dramatic, not detached
- Opinionated, not neutral
- Emotional, not clinical
- Winners celebrate, losers weep

Short sentences. Staccato rhythm. Exclamation points allowed!

GOOD: "It's over. The bulls won. $12M screamed it from the rooftops."
BAD: "Markets have rendered their verdict with unusual clarity..."

GOOD: "Nobody saw this coming. Then it happened."
BAD: "The outcome appears to have materialized contrary to expectations..."

BANNED: "Markets have spoken", "The consensus suggests", "Traders are pricing in",
        "The calculus shifts", "The ledger suggests", "very", "really", "basically"

PREFERRED: "It's done.", "The bulls won.", "History made.", "They did it.",
           "Nobody saw this coming.", "The doubters got crushed.", "Game over."

═══════════════════════════════════════════════════════════
RESPOND WITH JSON ONLY:
═══════════════════════════════════════════════════════════
{
  "0": "Your article for story 0...",
  "1": "Your article for story 1...",
  ...
}`;

            try {
                const response = await withRetry(async () => {
                    return client.chat.completions.create({
                        model: GEMINI_MODELS.SMART,
                        messages: [{ role: 'user', content: batchPrompt }],
                        temperature: 0.75,
                        max_tokens: 4000,
                    });
                }, 2, 500);

                const contentText = response.choices[0]?.message?.content || "";
                console.log(`Article Batch ${batchIdx} RAW:`, contentText.substring(0, 500)); // Debug

                const parsed = extractJSON<Record<string, string>>(contentText);
                console.log(`Article Batch ${batchIdx} KEYS:`, Object.keys(parsed)); // Debug

                // Merge results using global index mapping
                batch.forEach((item, localIdx) => {
                    const globalIdx = batchIdx * BATCH_SIZE + localIdx;
                    const content = parsed[String(globalIdx)] || parsed[item.id];

                    if (content) {
                        finalContent[item.id] = content;
                    } else {
                        // Fallback with contextual content
                        const story = stories.find(s => s.id === item.id);
                        if (story) {
                            finalContent[story.id] = generateFallbackArticle(story);
                        }
                    }
                });

                if (parsed.note && batchIdx === 0) {
                    finalEditorialNote = parsed.note;
                }

            } catch (error) {
                console.error(`Article Batch ${batchIdx} failed:`, error);
                // Fallback for this batch
                batch.forEach(item => {
                    const story = stories.find(s => s.id === item.id);
                    if (story) {
                        finalContent[story.id] = generateFallbackArticle(story);
                    }
                });
            }
        }));

        return { content: finalContent, editorialNote: finalEditorialNote };
    }
}
