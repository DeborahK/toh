import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { BehaviorSubject, Subject, combineLatest, Observable, of, merge } from 'rxjs';
import { catchError, concatMap, debounceTime, distinctUntilChanged, map, scan, shareReplay, switchMap, tap } from 'rxjs/operators';

import { Action, Hero } from './hero';
import { MessageService } from './message.service';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

@Injectable({ providedIn: 'root' })
export class HeroService {
  private heroesUrl = 'api/heroes';  // URL to web api

  // DJK1 Declarative approach to retrieving all heroes
  // With shareReplay(1) to retain the data across pages
  /** GET heroes from the server */
  allHeroes$ = this.http.get<Hero[]>(this.heroesUrl)
    .pipe(
      tap(_ => this.log('fetched heroes')),
      shareReplay(1),
      catchError(this.handleError<Hero[]>('getHeroes', []))
    );

  // DJK4 Declarative approach to create, update, and delete
  // Action stream defining the operation (create, update, delete)
  private heroCUDSubject = new Subject<Action<Hero>>();
  heroCUDAction$ = this.heroCUDSubject.asObservable();

  // If the UI needs notification of an operation
  // Add action streams for the completion
  private heroCreateCompleteSubject = new Subject<string>();
  heroCreateComplete$ = this.heroCreateCompleteSubject.asObservable();

  // Emit the results from all CRUD operations
  // from one stream
  heroes$ = merge(
    this.allHeroes$,
    this.heroCUDAction$.pipe(
      // Save the operation to the backend
      concatMap(actionHero => this.saveHero(actionHero).pipe(
        // Map the hero back to a Action<Hero> so that it can be used in the scan.
        map(hero => ({ action: actionHero.action, hero } as Action<Hero>))
      )),
    )
  ).pipe(
    // Modify the retained array of heroes
    // Be sure to see the scan to ensure correct data typing
    scan((heroes: Hero[], heroAction: Action<Hero>) => this.modifyHeroArray(heroes, heroAction)),
    shareReplay(1)
  );

  // Emit the results from all CRUD operations
  // from one stream
  // Version required for strict typing
  // heroes$ = merge(
  //   this.allHeroes$,
  //   this.heroCUDAction$.pipe(
  //     // Save the operation to the backend
  //     concatMap(actionHero => this.saveHero(actionHero).pipe(
  //       // Map the hero back to a Action<Hero> so that it can be used in the scan.
  //       map(hero => ({ action: actionHero.action, hero } as Action<Hero>))
  //     )),
  //   )
  // ).pipe(
  //   // Modify the retained array of heroes
  //   // Be sure to see the scan to ensure correct data typing
  //   scan((heroes, heroAction) => this.modifyHeroArray(heroes, heroAction), [] as Hero[]),
  //   shareReplay(1)
  // );

  //#region
  // DJK2 Declarative approach to selecting one item from the list
  // Use an action stream for the selection action
  private heroSelectedSubject = new BehaviorSubject<number>(0);
  // Expose the action as an observable for use by any components
  heroSelectedAction$ = this.heroSelectedSubject.asObservable();

  // Locating the hero in the already retrieved list of heroes
  // Combine the streams to "pass" both into the pipe chain
  hero$ = combineLatest([
    this.heroes$,
    this.heroSelectedAction$
  ]).pipe(
    map(([heroes, selectedHeroId]) =>
      heroes.find(hero => hero.id === selectedHeroId)
    )
  );

  // Retrieving the selected hero from the server
  // Use the Action stream and switchMap to get the item
  hero2$ = this.heroSelectedAction$.pipe(
    switchMap(id => {
      const url = `${this.heroesUrl}/${id}`;
      return this.http.get<Hero>(url).pipe(
        tap(_ => this.log(`fetched hero id=${id}`)),
        catchError(this.handleError<Hero>(`getHero id=${id}`))
      );
    })
  );

  // DJK3 Declarative approach to search
  private searchTermsSubject = new Subject<string>();
  searchTermsAction$ = this.searchTermsSubject.asObservable();

  // Filtering the already retrieved list of heroes
  // Combine the streams to "pass" both into the pipe chain
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
  // Use the Action stream and switchMap to get the matching items
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
      );
    })
  );
  //#endregion

  constructor(
    private http: HttpClient,
    private messageService: MessageService) { }

  //////// Action methods //////////
  //#region
  // DJK2 Emit when a hero is selected
  selectHero(id: number): void {
    this.heroSelectedSubject.next(id);
  }

  // DJK3 Emit when a search term is entered
  search(term: string): void {
    this.searchTermsSubject.next(term);
  }

  // DJK4 Emit when the user performs a create, update, or delete
  addHero(hero: Hero): void {
    this.heroCUDSubject.next({ action: 'add', hero });
  }

  deleteHero(hero: Hero): void {
    this.heroCUDSubject.next({ action: 'delete', hero });
  }

  updateHero(hero: Hero): void {
    this.heroCUDSubject.next({ action: 'update', hero });
  }

  // DJK4 Emit when the create operation is complete.
  // Define complete notifications only if needed in the component
  createComplete(): void {
    this.heroCreateCompleteSubject.next();
  }
  //#endregion

  //////// Save methods //////////
  //#region
  // DJK4 Add hero
  /** POST: add a new hero to the server */
  private addHeroOnServer(hero: Hero): Observable<Hero> {
    return this.http.post<Hero>(this.heroesUrl, hero, httpOptions).pipe(
      tap((newHero: Hero) => this.log(`added hero w/ id=${newHero.id}`)),
      // Provide notification that the post is complete
      tap(() => this.createComplete()),
      catchError(this.handleError<Hero>('addHero'))
    );
  }

  // DJK4 Delete hero
  /** DELETE: delete the hero from the server */
  private deleteHeroOnServer(hero: Hero): Observable<Hero> {
    const id = hero.id;
    const url = `${this.heroesUrl}/${id}`;

    return this.http.delete<Hero>(url, httpOptions).pipe(
      // Delete does NOT return the hero, so map to the passed in hero
      tap(_ => this.log(`deleted hero id=${id}`)),
      map(_ => hero),
      catchError(this.handleError<Hero>('deleteHero'))
    );
  }

  // DJK4 Update hero
  /** PUT: update the hero on the server */
  private updateHeroOnServer(hero: Hero): Observable<Hero> {
    return this.http.put<Hero>(this.heroesUrl, hero, httpOptions).pipe(
      tap(_ => this.log(`updated hero id=${hero.id}`)),
      // Put does not return the updated hero, so map to the passed in hero.
      map(_ => hero),
      catchError(this.handleError<Hero>('updateHero'))
    );
  }

  // Execute the appropriate operation based on the action
  private saveHero(heroAction: Action<Hero>): Observable<Hero> {
    if (heroAction.action === `add`) {
      return this.addHeroOnServer(heroAction.hero);
    } else if (heroAction.action === `update`) {
      return this.updateHeroOnServer(heroAction.hero);
    } else if (heroAction.action === 'delete') {
      return this.deleteHeroOnServer(heroAction.hero);
    }
    return of(heroAction.hero);
  }

  // Add to, update in, or delete item from the array
  private modifyHeroArray(heroes: Hero[], value: Action<Hero> | Hero[]): Hero[] {
    if (!(value instanceof Array)) {
      if (value.action === `add`) {
        // Add the hero to the array of heroes
        return [...heroes, value.hero];
      } else if (value.action === `update`) {
        // Update the hero in the array of heroes
        return heroes.map(h => h.id === value.hero.id ? value.hero : h);
      } else if (value.action === 'delete') {
        // Filter out the hero from the array of heroes
        return heroes.filter(h => h.id !== value.hero.id);
      }
    } else {
      return [...value];
    }
    return heroes;
  }

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
  //#endregion

  /** Log a HeroService message with the MessageService */
  private log(message: string): void {
    this.messageService.add(`HeroService: ${message}`);
  }
}
