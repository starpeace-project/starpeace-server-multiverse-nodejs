import { DateTime } from 'luxon';

export class Candidate {
  id: string; // tycoonId
  name: string; // tycoonName
  prestige: number;
  votes: number;

  constructor (id: string, name: string, prestige: number, votes: number) {
    this.id = id;
    this.name = name;
    this.prestige = prestige;
    this.votes = votes;
  }

  toJson (): any {
    return {
      id: this.id,
      name: this.name,
      prestige: this.prestige,
      votes: this.votes
    }
  }

  static fromJson (json: any): Candidate {
    return new Candidate(
      json.id,
      json.name,
      json.prestige ?? 0,
      json.votes ?? 0
    );
  }
}

export class Rating {
  type: string;
  delta: number;
  rating: number;

  constructor (type: string, delta: number, rating: number) {
    this.type = type;
    this.delta = delta;
    this.rating = rating;
  }

  toJson (): any {
    return {
      type: this.type,
      delta: this.delta,
      rating: this.rating
    }
  }

  static fromJson (json: any): Rating {
    return new Rating(
      json.type,
      json.delta ?? 0,
      json.rating ?? 0
    );
  }
}


export class CurrentTerm {
  start: DateTime;
  end: DateTime;
  length: number;

  politician: Candidate | undefined;
  overallRating: number;
  serviceRatings: Array<Rating>;

  constructor (start: DateTime, end: DateTime, length: number, politician: Candidate | undefined, overallRating: number, serviceRatings: Array<Rating>) {
    this.start = start;
    this.end = end;
    this.length = length;
    this.politician = politician;
    this.overallRating = overallRating;
    this.serviceRatings = serviceRatings;
  }

  toJson (): any {
    return {
      start: this.start.toISODate(),
      end: this.end.toISODate(),
      length: this.length,
      politician: this.politician?.toJson(),
      overallRating: this.overallRating,
      serviceRatings: this.serviceRatings.map(r => r.toJson())
    };
  }

  static fromJson (json: any): CurrentTerm {
    return new CurrentTerm(
      DateTime.fromISO(json.start),
      DateTime.fromISO(json.end),
      json.length ?? 1000,
      json.politician ? Candidate.fromJson(json.politician) : undefined,
      json.overallRating ?? 0,
      (json.serviceRatings ?? []).map(Rating.fromJson)
    )
  }
}

export class NextTerm {
  start: DateTime;
  end: DateTime;
  length: number;
  candidates: Array<Candidate>;

  constructor (start: DateTime, end: DateTime, length: number, candidates: Array<Candidate>) {
    this.start = start;
    this.end = end;
    this.length = length;
    this.candidates = candidates;
  }

  toJson (): any {
    return {
      start: this.start.toISODate(),
      end: this.end.toISODate(),
      length: this.length,
      candidates: this.candidates.map(c => c.toJson())
    };
  }

  static fromJson (json: any): NextTerm {
    return new NextTerm(
      DateTime.fromISO(json.start),
      DateTime.fromISO(json.end),
      json.length ?? 0,
      (json.candidates ?? []).map(Candidate.fromJson)
    )
  }
}

export default class GovernmentPolitics {
  townId: string;
  currentTerm: CurrentTerm;
  nextTerm: NextTerm;

  constructor (townId: string, currentTerm: CurrentTerm, nextTerm: NextTerm) {
    this.townId = townId;
    this.currentTerm = currentTerm;
    this.nextTerm = nextTerm;
  }

  toJson (): any {
    return {
      townId: this.townId,
      currentTerm: this.currentTerm.toJson(),
      nextTerm: this.nextTerm.toJson()
    };
  }

  static fromJson (json: any): GovernmentPolitics {
    return new GovernmentPolitics(
      json.townId,
      CurrentTerm.fromJson(json.currentTerm),
      NextTerm.fromJson(json.nextTerm)
    )
  }
}
