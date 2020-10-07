import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { BehaviorSubject, Subject, combineLatest, Observable, of, merge } from 'rxjs';
import { catchError, concatMap, debounceTime, distinctUntilChanged, map, scan, shareReplay, switchMap, tap } from 'rxjs/operators';

import { Hero } from './hero';
import { MessageService } from './message.service';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

@Injectable({ providedIn: 'root' })
export class HeroService {
  private heroesUrl = 'api/heroes';  // URL to web api

  // DJK 1: heroes$
  heroes$ = this.http.get<Hero[]>(this.heroesUrl)
    .pipe(
      tap(_ => this.log('fetched heroes')),
      shareReplay(1),
      catchError(this.handleError<Hero[]>('getHeroes', []))
    );

  // DJK 2: hero$
  private heroSelectedSubject = new BehaviorSubject<number>(0);
  // Expose the action as an observable for use by any components
  heroSelectedAction$ = this.heroSelectedSubject.asObservable();

  // Locating the hero in the already retrieved list of heroes
  hero$ = combineLatest([
    this.heroes$,
    this.heroSelectedAction$
  ]).pipe(
    map(([heroes, selectedHeroId]) =>
      heroes.find(hero => hero.id === selectedHeroId)
    )
  );

  // Retrieving the selected hero from the server
  hero2$ = this.heroSelectedAction$.pipe(
    switchMap(id => {
      const url = `${this.heroesUrl}/${id}`;
      return this.http.get<Hero>(url).pipe(
        tap(_ => this.log(`fetched hero id=${id}`)),
        catchError(this.handleError<Hero>(`getHero id=${id}`))
      )
    })
  );

  // DJK 3: Search
  private searchTermsSubject = new Subject<string>();
  searchTermsAction$ = this.searchTermsSubject.asObservable();

  // Filtering the already retrieved list of heroes
  filteredHeroes$ = combineLatest([
    this.heroes$,
    this.searchTermsAction$.pipe(
      // wait 300ms after each keystroke before considering the term
      debounceTime(300),
      // ignore new term if same as previous term
      distinctUntilChanged()
    )
  ]).pipe(
    tap(([heroes, term]) => this.log(`term "${term}"`)),
    map(([heroes, term]) =>
      heroes.filter(hero => hero.name.toLowerCase().includes(term.toLowerCase())))
  );

  // Filtering on the server
  filteredHeroes2$ = this.searchTermsAction$.pipe(
    // wait 300ms after each keystroke before considering the term
    debounceTime(300),
    // ignore new term if same as previous term
    distinctUntilChanged(),
    switchMap(term => {
      if (!term.trim()) {
        // if no search term, return empty hero array.
        return of([]);
      }
      return this.http.get<Hero[]>(`${this.heroesUrl}/?name=${term}`).pipe(
        tap(_ => this.log(`found heroes matching "${term}"`)),
        catchError(this.handleError<Hero[]>('searchHeroes', []))
      )
    })
  );

  // DJK 4: CRUD
  private newHeroSubject = new Subject<Hero>();
  newHeroAction$ = this.newHeroSubject.asObservable();

  heroesAdded$ = merge(
    this.heroes$,
    this.newHeroAction$.pipe(
      concatMap(hero => this.http.post<Hero>(this.heroesUrl, hero, httpOptions).pipe(
        tap((newHero: Hero) => this.log(`added hero w/ id=${newHero.id}`)),
        catchError(this.handleError<Hero>('addHero'))
      ))
    )).pipe(
      scan((heroes: Hero[], hero: Hero) => [...heroes, hero]),
      tap(heroes => console.log('Add', JSON.stringify(heroes)))
    );

  private updateHeroSubject = new Subject<Hero>();
  updateHeroAction$ = this.updateHeroSubject.asObservable();

  heroesUpdated$ = merge(
    this.heroes$,
    this.updateHeroAction$.pipe(
      concatMap(hero => this.http.put<Hero>(this.heroesUrl, hero, httpOptions).pipe(
        tap(_ => this.log(`updated hero id=${hero.id}`)),
        catchError(this.handleError<any>('updateHero'))
      ))
    )).pipe(
      scan((heroes: Hero[], hero: Hero) => heroes.map(h => h.id === hero.id ? hero : h)),
      tap(heroes => console.log('Update', JSON.stringify(heroes)))
    );

  private deleteHeroSubject = new Subject<Hero>();
  deleteHeroAction$ = this.deleteHeroSubject.asObservable();

  heroesDeleted$ = merge(
    this.heroes$,
    this.deleteHeroAction$.pipe(
      concatMap(hero => this.http.delete<Hero>(`${this.heroesUrl}/${hero.id}`, httpOptions).pipe(
        tap(_ => this.log(`deleted hero id=${hero.id}`)),
        // Return the hero so that it can be used in the scan.
        map(_ => hero),
        catchError(this.handleError<Hero>('deleteHero'))
      ))
    )).pipe(
      scan((heroes: Hero[], hero: Hero) => heroes.filter(h => h.id !== hero.id)),
      tap(heroes => console.log('Delete', JSON.stringify(heroes)))
    );

  // Emit the results from all CRUD operations
  // from one stream
  heroesWithCRUD$ = merge(
    this.heroesAdded$,
    this.heroesUpdated$,
    this.heroesDeleted$
  );

  constructor(
    private http: HttpClient,
    private messageService: MessageService) { }

  // DJK 2: hero$
  heroSelected(id: number) {
    this.heroSelectedSubject.next(id);
  }

  // DJK 3: Search
  search(term: string): void {
    this.searchTermsSubject.next(term);
  }

  // DJK 4: CRUD
  addHero(hero: Hero) {
    this.newHeroSubject.next(hero);
  }

  deleteHero(hero: Hero) {
    this.deleteHeroSubject.next(hero);
  }

  updateHero(hero: Hero) {
    this.updateHeroSubject.next(hero);
  }

  /** GET heroes from the server */
  // DJK 1: heroes$
  // getHeroes (): Observable<Hero[]> {
  //   return this.http.get<Hero[]>(this.heroesUrl)
  //     .pipe(
  //       tap(_ => this.log('fetched heroes')),
  //       catchError(this.handleError<Hero[]>('getHeroes', []))
  //     );
  // }

  /** GET hero by id. Return `undefined` when id not found */
  getHeroNo404<Data>(id: number): Observable<Hero> {
    const url = `${this.heroesUrl}/?id=${id}`;
    return this.http.get<Hero[]>(url)
      .pipe(
        map(heroes => heroes[0]), // returns a {0|1} element array
        tap(h => {
          const outcome = h ? `fetched` : `did not find`;
          this.log(`${outcome} hero id=${id}`);
        }),
        catchError(this.handleError<Hero>(`getHero id=${id}`))
      );
  }

  // DJK 2: hero$
  /** GET hero by id. Will 404 if id not found */
  // getHero(id: number): Observable<Hero> {
  //   const url = `${this.heroesUrl}/${id}`;
  //   return this.http.get<Hero>(url).pipe(
  //     tap(_ => this.log(`fetched hero id=${id}`)),
  //     catchError(this.handleError<Hero>(`getHero id=${id}`))
  //   );
  // }

  // DJK 3: Search
  /* GET heroes whose name contains search term */
  // searchHeroes(term: string): Observable<Hero[]> {
  //   if (!term.trim()) {
  //     // if not search term, return empty hero array.
  //     return of([]);
  //   }
  //   return this.http.get<Hero[]>(`${this.heroesUrl}/?name=${term}`).pipe(
  //     tap(_ => this.log(`found heroes matching "${term}"`)),
  //     catchError(this.handleError<Hero[]>('searchHeroes', []))
  //   );
  // }

  //////// Save methods //////////

  // DJK 4: Add hero
  /** POST: add a new hero to the server */
  // addHero(hero: Hero): Observable<Hero> {
  //   return this.http.post<Hero>(this.heroesUrl, hero, httpOptions).pipe(
  //     tap((newHero: Hero) => this.log(`added hero w/ id=${newHero.id}`)),
  //     catchError(this.handleError<Hero>('addHero'))
  //   );
  // }

  // /** DELETE: delete the hero from the server */
  // deleteHero(hero: Hero | number): Observable<Hero> {
  //   const id = typeof hero === 'number' ? hero : hero.id;
  //   const url = `${this.heroesUrl}/${id}`;

  //   return this.http.delete<Hero>(url, httpOptions).pipe(
  //     tap(_ => this.log(`deleted hero id=${id}`)),
  //     catchError(this.handleError<Hero>('deleteHero'))
  //   );
  // }

  // /** PUT: update the hero on the server */
  // updateHero(hero: Hero): Observable<any> {
  //   return this.http.put(this.heroesUrl, hero, httpOptions).pipe(
  //     tap(_ => this.log(`updated hero id=${hero.id}`)),
  //     catchError(this.handleError<any>('updateHero'))
  //   );
  // }

  /**
   * Handle Http operation that failed.
   * Let the app continue.
   * @param operation - name of the operation that failed
   * @param result - optional value to return as the observable result
   */
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {

      // TODO: send the error to remote logging infrastructure
      console.error(error); // log to console instead

      // TODO: better job of transforming error for user consumption
      this.log(`${operation} failed: ${error.message}`);

      // Let the app keep running by returning an empty result.
      return of(result as T);
    };
  }

  /** Log a HeroService message with the MessageService */
  private log(message: string) {
    this.messageService.add(`HeroService: ${message}`);
  }
}
