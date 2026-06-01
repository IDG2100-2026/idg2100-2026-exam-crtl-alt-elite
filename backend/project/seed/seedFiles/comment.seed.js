import { Comment } from "../../models/comment.js";
import { User } from "../../models/user.js";
import { Game } from "../../models/game.js";
import { Tournament } from "../../models/tournament.js";

// Seeds comments on finished games
async function _seedGameComments(users, games) {
    const commentDocs = [];
    const finishedGames = games.filter(game => game.status === "finished");

    // Add 2 comments per finished game from different users
    for (let i = 0; i < finishedGames.length; i++) {
        const game = finishedGames[i];
        const user1 = users[i % users.length];
        const user2 = users[(i + 1) % users.length];

        commentDocs.push(new Comment({
            userId: user1.userId,
            targetType: "game",
            targetId: game.gameId,
            content: "What a great game, well played!"
        }));

        commentDocs.push(new Comment({
            userId: user2.userId,
            targetType: "game",
            targetId: game.gameId,
            content: "That last round was intense!"
        }));
    }

    // Add a soft deleted comment to showcase admin functionality
    const deletedComment = new Comment({
        userId: users[0].userId,
        targetType: "game",
        targetId: finishedGames[0].gameId,
        content: "This comment has been removed by an admin.",
        isDeleted: true
    });
    commentDocs.push(deletedComment);

    await Promise.all(commentDocs.map(c => c.save()));
    console.log(`Inserted ${commentDocs.length} game comments`);
}

// Seeds comments on tournaments
async function _seedTournamentComments(users, tournaments) {
    const commentDocs = [];

    // Add 2 comments per tournament from different users
    for (let i = 0; i < tournaments.length; i++) {
        const tournament = tournaments[i];

        // Skip cancelled tournaments - no point commenting on them
        if (tournament.status === "cancelled") continue;

        const user1 = users[i % users.length];
        const user2 = users[(i + 1) % users.length];

        commentDocs.push(new Comment({
            userId: user1.userId,
            targetType: "tournament",
            targetId: tournament.tournamentId,
            content: "Can't wait for this tournament!"
        }));

        commentDocs.push(new Comment({
            userId: user2.userId,
            targetType: "tournament",
            targetId: tournament.tournamentId,
            content: "This is going to be amazing!"
        }));
    }

    await Promise.all(commentDocs.map(c => c.save()));
    console.log(`Inserted ${commentDocs.length} tournament comments`);
}

// Clears existing comments and seeds new ones
export async function seedComments() {
    await Comment.deleteMany({});
    console.log("Deleted existing comments");

    // Fetch once and pass down to avoid multiple DB calls
    const users = await User.find({ role: "user" });
    const games = await Game.find();
    const tournaments = await Tournament.find();

    await _seedGameComments(users, games);
    await _seedTournamentComments(users, tournaments);
}