import { expect } from "chai";

describe("Course creation in Library", function () {
  beforeEach(() => {
    cy.visit('/library');
  });

  // it('Creating a new course by clicking the create a new course button', function() {
  //   cy.get('[data-cy=createNewCourseButton]').click();
  //   cy.get(':nth-child(1) > :nth-child(1) > [data-cy=navDriveHeader]').should('exist');
    
  //   cy.get('[data-cy=navPanel]').within(() => {
  //     cy.get('[data-cy=navDriveHeader]').should('exist');
  //   }); 
  // });

  // it('Clicking on a course in the NavPanel should select it and open it up in the drive', function() {
  //   let courseNavDriveLabel = "";
  //   cy.get('[data-cy=navPanel]').within(() => {
  //     const courseDriveHeader = cy.get('[data-cy=navDriveHeader]').first();
  //     courseDriveHeader.click();

  //     courseDriveHeader.invoke('text').then(navDriveLabel => {
  //       courseNavDriveLabel = navDriveLabel;
  //     })
  //   }); 
  //   // Check for drive label equality across nav panel and breadcrumb
  //   cy.get('[data-cy=breadcrumbDriveColumn]').invoke('text').then(breadcrumbDriveLabel => {
  //     expect(courseNavDriveLabel.trim()).equal(breadcrumbDriveLabel.trim());
  //   })
  // });
});

describe("Library", function () {
  beforeEach(() => {
    cy.visit('/library');

    // Create a new course and select it
    cy.get('[data-cy=createNewCourseButton]').click();
    cy.wait(500);
    cy.get(':nth-child(1) > :nth-child(1) > [data-cy=navDriveHeader]').click();
  });

  // it('Creating a folder at drive level by clicking on the Add Folder button', function() {
  //   cy.get('[data-cy=addFolderButton]').click();

  //   // Verify item existence and type
  //   cy.get('[data-cy=mainPanel]').within(() => {
  //     cy.get('[data-cy=driveItem]').first().should('exist');
  //     cy.get('[data-cy=driveItem]').first().within(() => {
  //       cy.get('[data-cy=folderIcon]').should('exist');
  //     })
  //   });
  // })

  // it('Creating a folder within another folder', function() {
  //   cy.get('[data-cy=addFolderButton]').click();

  //   cy.get('[data-cy=navPanel]').within(() => {
  //     // Get second item in navPanel
  //     const folder = cy.get('[data-cy=driveItem]').eq(1);

  //     // Verify item is a folder
  //     folder.within(() => {
  //       cy.get('[data-cy=folderIcon]').should('exist');
  //     });

  //     // Select folder
  //     folder.click();
  //   }); 

  //   cy.get('[data-cy=addFolderButton]').click();

  //   // Verify item existence and type
  //   cy.get('[data-cy=mainPanel]').within(() => {
  //     cy.get('[data-cy=driveItem]').first().should('exist');
  //     cy.get('[data-cy=driveItem]').first().within(() => {
  //       cy.get('[data-cy=folderIcon]').should('exist');
  //     })
  //   });
  // })

  // it('Single-clicking on a folder should select it and displays information about it in the InfoPanel', function() {
  //   cy.get('[data-cy=addFolderButton]').click();

  //   // Check for item label equality across Drive and InfoPanel
  //   let folderLabel = "";
  //   cy.get('[data-cy=mainPanel]').within(() => {
  //     cy.get('[data-cy=driveItem]').first().click();
  //     cy.get('[data-cy=driveItem]').first().within(() => {
  //       cy.get('[data-cy=folderLabel]').invoke('text').then(label => {
  //         folderLabel = label;
  //       })
  //     })
  //   }); 
  //   cy.get('[data-cy=infoPanelItemLabel]').invoke('text').then(infoPanelItemLabel => {
  //     expect(folderLabel.trim()).equal(infoPanelItemLabel.trim());
  //   })   
  // });

  // it('Single-clicking on a folder caret should expand/close folder', function() {
  //   cy.get('[data-cy=addFolderButton]').click();

  //   cy.get('[data-cy=mainPanel]').within(() => {
  //     cy.get('[data-cy=driveItem]').first().within(() => {
  //       cy.get('[data-cy=folderToggleOpenIcon]').click();
  //       cy.get('[data-cy=folderToggleOpenIcon]').should('not.exist');
  //       cy.get('[data-cy=folderToggleCloseIcon]').should('exist');

  //       cy.get('[data-cy=folderToggleCloseIcon]').click();
  //       cy.get('[data-cy=folderToggleCloseIcon]').should('not.exist');
  //       cy.get('[data-cy=folderToggleOpenIcon]').should('exist');
  //     })
  //   });
  // });

  // it('Double-clicking on a folder should expand/close folder', function() {
  //   cy.get('[data-cy=addFolderButton]').click();

  //   cy.get('[data-cy=mainPanel]').within(() => {
  //     const folder = cy.get('[data-cy=driveItem]').first();
  //     folder.within(() => {
  //       folder.dblclick();
  //       cy.get('[data-cy=folderToggleOpenIcon]').should('not.exist');
  //       cy.get('[data-cy=folderToggleCloseIcon]').should('exist');

  //       folder.dblclick();
  //       cy.get('[data-cy=folderToggleCloseIcon]').should('not.exist');
  //       cy.get('[data-cy=folderToggleOpenIcon]').should('exist');
  //     })
  //   });
  // });

  // it('Creating a new DoenetML by clicking on the Add DoenetML button', function() {
  //   cy.get('[data-cy=addDoenetMLButton]').click();

  //   // Verify item existence and type
  //   cy.get(':nth-child(1) > [data-cy=driveItem]').should('exist');
  //   cy.get(':nth-child(1) > [data-cy=driveItem]').within(() => {
  //     cy.get('[data-cy=doenetMLIcon]').should('exist');
  //   });    
  // })

  // it('Single-clicking on a DoenetML should select it and displays information about it in the InfoPanel', function() {
  //   cy.get('[data-cy=addDoenetMLButton]').click();

  //   // Check for item label equality across Drive and InfoPanel
  //   let doenetMLLabel = "";
  //   cy.get('[data-cy=mainPanel]').within(() => {
  //     cy.get('[data-cy=driveItem]').first().click();
  //     cy.get('[data-cy=driveItem]').first().within(() => {
  //       cy.get('[data-cy=doenetMLLabel]').invoke('text').then(label => {
  //         doenetMLLabel = label;
  //       })
  //     })
  //   }); 
  //   cy.get('[data-cy=infoPanelItemLabel]').invoke('text').then(infoPanelItemLabel => {
  //     expect(doenetMLLabel.trim()).equal(infoPanelItemLabel.trim());
  //   })   
  // });
});